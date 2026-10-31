// node tools/site/export.ts（hiragana-mahjong）で src/core/yaku.ts から書き出したもの。手で直さない
//#region src/core/yaku.ts
/** カテゴリのデータから lookup を作る。一覧にない小分類があれば（データの誤りなので）Error を投げる */
function createCategoryLookup(data) {
	const bySmall = new Map(data.categories.map((c) => [c.small, c]));
	const byReading = /* @__PURE__ */ new Map();
	for (const [reading, smalls] of Object.entries(data.words)) byReading.set(reading, smalls.map((small) => {
		const category = bySmall.get(small);
		if (category === void 0) throw new Error(`不明な小分類: ${reading} の ${small}`);
		return category;
	}));
	return (reading) => byReading.get(reading) ?? [];
}
const HAN = {
	big: [
		0,
		0,
		1,
		2,
		4
	],
	small: [
		0,
		0,
		2,
		4,
		8
	]
};
const YAKUMAN_COUNT = 5;
const keyOf = (p) => p.level === "big" ? `big:${p.big}` : `small:${p.big}/${p.small}`;
/** 1語の割り当て先の候補。どこにも入れない（null）、持っている小分類、その大分類 */
function optionsOf(categories) {
	const options = [null];
	const seen = /* @__PURE__ */ new Set();
	for (const { big, small } of categories) for (const p of [{
		level: "small",
		big,
		small
	}, {
		level: "big",
		big,
		small: null
	}]) if (!seen.has(keyOf(p))) {
		seen.add(keyOf(p));
		options.push(p);
	}
	return options;
}
function evaluate(words, picks) {
	const groups = /* @__PURE__ */ new Map();
	for (const [i, p] of picks.entries()) {
		if (p === null) continue;
		const group = groups.get(keyOf(p)) ?? {
			...p,
			words: [],
			han: 0,
			yakuman: 0
		};
		group.words.push(words[i]);
		groups.set(keyOf(p), group);
	}
	const result = {
		han: 0,
		yakuman: 0,
		groups: []
	};
	for (const g of groups.values()) {
		if (g.words.length >= 5) {
			g.yakuman = g.level === "small" ? 2 : 1;
			result.yakuman = g.yakuman;
		} else {
			g.han = HAN[g.level][g.words.length] ?? 0;
			result.han += g.han;
		}
		if (g.han > 0 || g.yakuman > 0) result.groups.push(g);
	}
	if (result.yakuman > 0) {
		result.han = 0;
		result.groups = result.groups.filter((g) => g.yakuman > 0);
	}
	return result;
}
/**
* 役の判定。1語は1つのグループにだけ入れ、同じカテゴリの語はまとめて1つのグループとして数える。
* 割り当ては、役満（ダブル役満）が最優先、次に翻が最も多くなる組み合わせを総当たりで選ぶ（同じなら先に見つけたもの）。
* 満貫以上は基本点が同じでも、翻が多い方を選ぶ
*/
function evaluateYaku(words, lookup) {
	const options = words.map((w) => optionsOf(lookup(w)));
	const picks = [];
	let best = {
		han: 0,
		yakuman: 0,
		groups: []
	};
	let bestRank = 0;
	const search = (i) => {
		if (i === words.length) {
			const yaku = evaluate(words, picks);
			const rank = yaku.yakuman > 0 ? 1e3 * yaku.yakuman : yaku.han;
			if (rank > bestRank) {
				best = yaku;
				bestRank = rank;
			}
			return;
		}
		for (const option of options[i]) {
			picks[i] = option;
			search(i + 1);
		}
	};
	search(0);
	return best;
}
//#endregion
export { HAN, YAKUMAN_COUNT, createCategoryLookup, evaluateYaku };
