// node_modules/svelte/src/constants.js
var e = {}, t = Symbol("uninitialized"), n = "http://www.w3.org/1999/xhtml", r = Array.isArray, i = Array.prototype.indexOf, a = Array.prototype.includes, o = Array.from, s = Object.defineProperty, c = Object.getOwnPropertyDescriptor, l = Object.getOwnPropertyDescriptors, u = Object.prototype, d = Array.prototype, f = Object.getPrototypeOf, p = Object.isExtensible, m = () => {};
function h(e) {
	for (var t = 0; t < e.length; t++) e[t]();
}
function ee() {
	var e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/typeof.js
function g(e) {
	"@babel/helpers - typeof";
	return g = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, g(e);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPrimitive.js
function _(e, t) {
	if (g(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (g(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPropertyKey.js
function v(e) {
	var t = _(e, "string");
	return g(t) == "symbol" ? t : t + "";
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/defineProperty.js
function y(e, t, n) {
	return (t = v(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
// node_modules/svelte/src/internal/client/constants.js
var te, b = 1024, x = 2048, ne = 4096, re = 8192, ie = 16384, ae = 32768, oe = 1 << 25, se = 65536, ce = 1 << 19, le = 1 << 20, ue = 1 << 25, de = 1 << 21, fe = 1 << 22, pe = 1 << 23, me = Symbol("$state"), he = Symbol("component"), ge = Symbol(""), _e = Symbol("attributes"), ve = Symbol("class"), ye = Symbol("style"), be = Symbol("text"), xe = new class extends Error {
	constructor(...e) {
		super(...e), y(this, "name", "StaleReactionError"), y(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
	}
}(), Se = !!((te = globalThis.document) != null && te.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function Ce() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function we(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Te() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
// node_modules/svelte/src/internal/client/dom/hydration.js
var S = !1;
function Ee(e) {
	S = e;
}
var C;
function w(t) {
	if (t === null) throw we(), e;
	return C = t;
}
function De() {
	return w(/* @__PURE__ */ Sn(C));
}
function Oe(t) {
	if (S) {
		if (/* @__PURE__ */ Sn(C) !== null) throw we(), e;
		C = t;
	}
}
function ke(e = 1) {
	if (S) {
		for (var t = e, n = C; t--;) n = /* @__PURE__ */ Sn(n);
		C = n;
	}
}
function Ae(e = !0) {
	for (var t = 0, n = C;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ Sn(n);
		e && n.remove(), n = i;
	}
}
function je(t) {
	if (!t || t.nodeType !== 8) throw we(), e;
	return t.data;
}
// node_modules/svelte/src/internal/client/reactivity/equality.js
function Me(e) {
	return e === this.v;
}
function Ne(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function Pe(e) {
	return !Ne(e, this.v);
}
// node_modules/svelte/src/internal/client/errors.js
function Fe() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function Ie(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function Le() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Re() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function ze() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function Be() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Ve() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
// node_modules/svelte/src/internal/client/context.js
var T = null;
function He(e) {
	T = e;
}
function Ue(e, t = !1, n) {
	T = {
		p: T,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: B,
		l: null
	};
}
function We(e) {
	var t = T, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) Ln(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, T = t.p, Ge(e);
}
function Ge(e = {}) {
	return s(e, he, { value: !0 }), e;
}
function Ke() {
	return !0;
}
// node_modules/svelte/src/internal/client/dom/task.js
var qe = [];
function Je() {
	var e = qe;
	qe = [], h(e);
}
function Ye(e) {
	if (qe.length === 0 && !bt) {
		var t = qe;
		queueMicrotask(() => {
			t === qe && Je();
		});
	}
	qe.push(e);
}
function Xe() {
	for (; qe.length > 0;) Je();
}
// node_modules/svelte/src/internal/client/reactivity/status.js
var Ze = ~(x | ne | b);
function E(e, t) {
	e.f = e.f & Ze | t;
}
function Qe(e) {
	e.f & 512 || e.deps === null ? E(e, b) : E(e, ne);
}
// node_modules/svelte/src/internal/client/reactivity/utils.js
function $e(e, t) {
	e.f & 2048 ? t.set(e, x) : e.f & 4096 && t.get(e) !== 2048 && t.set(e, ne), E(e, b);
}
// node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function et(e) {
	var t = L, n = B;
	z(null), rr(null);
	try {
		return e();
	} finally {
		z(t), rr(n);
	}
}
// node_modules/svelte/src/internal/client/reactivity/async.js
function tt(e, t, n, r) {
	let i = Ke() ? at : ct;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = B, c = nt(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				Mn(e, s);
			}
			rt();
		}
	}
	var d = it();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ st(e))).then(u).catch((e) => Mn(e, s)).finally(d);
	}
	l ? l.then(() => {
		s.f & 16384 ? d() : (c(), f(), rt());
	}) : f();
}
function nt() {
	var e = B, t = L, n = T, r = j;
	return function(i = !0) {
		rr(e), z(t), He(n), i && !(e.f & 16384) && (r == null || r.activate(), r == null || r.apply());
	};
}
function rt(e = !0) {
	rr(null), z(null), He(null), e && (j == null || j.deactivate());
}
function it() {
	var e = B, t = e.b, n = j, r = !!(t != null && t.is_rendered());
	return t == null || t.update_pending_count(1, n), n.increment(r, e), () => {
		t == null || t.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function at(e) {
	var n = 2 | x;
	return B !== null && (B.f |= ce), {
		ctx: T,
		deps: null,
		effects: null,
		equals: Me,
		f: n,
		fn: e,
		reactions: null,
		rv: 0,
		v: t,
		wv: 0,
		parent: B,
		ac: null
	};
}
var ot = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function st(e, n, r) {
	let i = B;
	i === null && Fe();
	var a = void 0, o = an(t), s = !L, c = /* @__PURE__ */ new Set();
	return Bn(() => {
		var t = B, n = ee();
		a = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== xe && n.reject(e);
			}).finally(rt);
		} catch (e) {
			n.reject(e), rt();
		}
		var r = j;
		if (s) {
			var l;
			if (t.f & 32768) var u = it();
			if ((l = i.b) != null && l.is_rendered()) {
				var d;
				(d = r.async_deriveds.get(t)) == null || d.reject(ot);
			} else for (let e of c.values()) e.reject(ot);
			c.add(n), r.async_deriveds.set(t, n);
		}
		let f = (e, t = void 0) => {
			u == null || u(), c.delete(n), t !== ot && (r.activate(), t ? (o.f |= pe, dn(o, t)) : (o.f & 8388608 && (o.f ^= pe), dn(o, e)), r.deactivate());
		};
		n.promise.then(f, (e) => f(null, e || "unknown"));
	}), In(() => {
		for (let e of c) e.reject(ot);
	}), new Promise((e) => {
		function t(n) {
			function r() {
				n === a ? e(o) : t(a);
			}
			n.then(r, r);
		}
		t(a);
	});
}
/*#__NO_SIDE_EFFECTS__*/
function ct(e) {
	let t = /* @__PURE__ */ at(e);
	return t.equals = Pe, t;
}
function lt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) I(t[n]);
	}
}
function ut(e) {
	var n, r = B, i = e.parent;
	if (!tr && i !== null && e.v !== t && i.f & 24576) return Ce(), e.v;
	rr(i);
	try {
		lt(e), n = mr(e);
	} finally {
		rr(r);
	}
	return n;
}
function dt(e) {
	var t = ut(e);
	!e.equals(t) && (e.wv = dr(), (!(j != null && j.is_fork) || e.deps === null) && (j === null ? e.v = t : (j.capture(e, t, !0), vt == null || vt.capture(e, t, !0)), e.deps === null)) ? E(e, b) : tr || (M === null ? Qe(e) : (Fn() || j != null && j.is_fork) && M.set(e, t));
}
function ft(e) {
	if (e.effects !== null) {
		for (let n of e.effects) if (n.teardown || n.ac) {
			var t;
			(t = n.teardown) == null || t.call(n), n.ac !== null && et(() => {
				n.ac.abort(xe), n.ac = null;
			}), n.fn !== null && (n.teardown = m), _r(n, 0), Gn(n);
		}
	}
}
function pt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && vr(t);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/checkPrivateRedeclaration.js
function mt(e, t) {
	if (t.has(e)) throw TypeError("Cannot initialize the same private elements twice on an object");
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateMethodInitSpec.js
function ht(e, t) {
	mt(e, t), t.add(e);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateFieldInitSpec.js
function D(e, t, n) {
	mt(e, t), t.set(e, n);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/assertClassBrand.js
function O(e, t, n) {
	if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
	throw TypeError("Private element is not present on this object");
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateFieldGet2.js
function k(e, t) {
	return e.get(O(e, t));
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateFieldSet2.js
function A(e, t, n) {
	return e.set(O(e, t), n), n;
}
// node_modules/svelte/src/internal/client/reactivity/batch.js
var gt, _t = null, j = null, vt = null, M = null, yt = null, bt = !1, xt = !1, St = null, Ct = null, wt = 0, Tt = 1, Et = /* @__PURE__ */ new WeakMap(), Dt = /* @__PURE__ */ new WeakMap(), Ot = /* @__PURE__ */ new WeakMap(), kt = /* @__PURE__ */ new WeakMap(), At = /* @__PURE__ */ new WeakMap(), jt = /* @__PURE__ */ new WeakMap(), Mt = /* @__PURE__ */ new WeakMap(), Nt = /* @__PURE__ */ new WeakMap(), Pt = /* @__PURE__ */ new WeakMap(), Ft = /* @__PURE__ */ new WeakMap(), It = /* @__PURE__ */ new WeakMap(), N = /* @__PURE__ */ new WeakSet(), Lt = class e {
	constructor() {
		ht(this, N), y(this, "id", Tt++), y(this, "started", !1), y(this, "linked", !0), y(this, "prev", null), y(this, "next", null), y(this, "async_deriveds", /* @__PURE__ */ new Map()), y(this, "current", /* @__PURE__ */ new Map()), y(this, "previous", /* @__PURE__ */ new Map()), D(this, Et, /* @__PURE__ */ new Set()), D(this, Dt, /* @__PURE__ */ new Set()), D(this, Ot, 0), D(this, kt, /* @__PURE__ */ new Map()), D(this, At, null), D(this, jt, []), D(this, Mt, []), D(this, Nt, /* @__PURE__ */ new Map()), D(this, Pt, /* @__PURE__ */ new Map()), D(this, Ft, /* @__PURE__ */ new Set()), y(this, "is_fork", !1), D(this, It, !1), _t === null ? _t = this : (_t.next = this, this.prev = _t), _t = this;
	}
	skip_effect(e) {
		k(Pt, this).has(e) || k(Pt, this).set(e, {
			d: [],
			m: []
		}), k(Ft, this).delete(e);
	}
	unskip_effect(e, t = (e) => this.schedule(e)) {
		var n = k(Pt, this).get(e);
		if (n) {
			k(Pt, this).delete(e);
			for (var r of n.d) E(r, x), t(r);
			for (r of n.m) E(r, ne), t(r);
		}
		k(Ft, this).add(e);
	}
	capture(e, n, r = !1) {
		e.v !== t && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [n, r]), M == null || M.set(e, n)), this.is_fork || (e.v = n);
	}
	activate() {
		j = this;
	}
	deactivate() {
		j = null, M = null;
	}
	flush() {
		try {
			xt = !0, j = this, O(N, this, Vt).call(this);
		} finally {
			wt = 0, yt = null, St = null, Ct = null, xt = !1, j = null, M = null, nn.clear();
		}
	}
	discard() {
		var e;
		for (let e of k(Dt, this)) e(this);
		k(Dt, this).clear();
		for (let e of this.async_deriveds.values()) e.reject(ot);
		O(N, this, qt).call(this), (e = k(At, this)) == null || e.resolve();
	}
	register_created_effect(e) {
		k(Mt, this).push(e);
	}
	increment(e, t) {
		if (A(Ot, this, k(Ot, this) + 1), e) {
			let e = k(kt, this).get(t) ?? 0;
			k(kt, this).set(t, e + 1);
		}
	}
	decrement(e, t) {
		if (A(Ot, this, k(Ot, this) - 1), e) {
			let e = k(kt, this).get(t) ?? 0;
			e === 1 ? k(kt, this).delete(t) : k(kt, this).set(t, e - 1);
		}
		k(It, this) || (A(It, this, !0), Ye(() => {
			A(It, this, !1), this.linked && this.flush();
		}));
	}
	transfer_reactions(e) {
		for (let [t, n] of e) this.add_dirty_reaction(t, n);
		e.clear();
	}
	add_dirty_reaction(e, t) {
		(t === 2048 || k(Nt, this).get(e) !== 2048) && k(Nt, this).set(e, t);
	}
	oncommit(e) {
		k(Et, this).add(e);
	}
	ondiscard(e) {
		k(Dt, this).add(e);
	}
	settled() {
		return (k(At, this) ?? A(At, this, ee())).promise;
	}
	static ensure() {
		if (j === null) {
			let t = j = new e();
			!xt && !bt && Ye(() => {
				t.started || t.flush();
			});
		}
		return j;
	}
	apply() {
		M = null;
	}
	schedule(e) {
		var t;
		yt = e, (t = e.b) != null && t.is_pending && e.f & 16777228 && !(e.f & 32768) ? e.b.defer_effect(e) : k(jt, this).push(e);
	}
};
gt = Lt;
function Rt() {
	if (this.is_fork) return !0;
	for (let e of k(kt, this).keys()) if (!O(N, this, zt).call(this, e)) return !0;
	return !1;
}
function zt(e) {
	for (var t = e; t !== null; t = t.parent) if (k(Pt, this).has(t)) return !0;
	return !1;
}
function Bt() {
	var e = [];
	for (let i of k(jt, this)) if (!(i.f & 16384 || !(i.f & 6144))) {
		for (var t = i, n = !1; t.parent !== null;) {
			t = t.parent;
			var r = t.f;
			if (r & 96) {
				if (!(r & 1024)) {
					n = !0;
					break;
				}
				t.f ^= b;
			}
		}
		n || e.push(t);
	}
	return A(jt, this, []), e;
}
function Vt() {
	var e;
	this.started = !0;
	for (let [e, t] of k(Nt, this)) E(e, t), this.schedule(e);
	this.apply();
	for (var t = St = [], n = [], r = Ct = []; k(jt, this).length > 0;) {
		wt++ > 1e3 && (O(N, this, qt).call(this), Yt());
		for (let e of O(N, this, Bt).call(this)) try {
			O(N, this, Ht).call(this, e, t, n);
		} catch (t) {
			throw en(e), O(N, this, Rt).call(this) || this.discard(), t;
		}
	}
	if (j = null, r.length > 0) {
		var i = gt.ensure();
		for (let e of r) i.schedule(e);
	}
	if (St = null, Ct = null, O(N, this, Rt).call(this)) {
		O(N, this, Kt).call(this, n), O(N, this, Kt).call(this, t);
		for (let [e, t] of k(Pt, this)) $t(e, t);
		r.length > 0 && O(N, j, Vt).call(j);
		return;
	}
	let a = O(N, this, Ut).call(this);
	if (a) O(N, this, Kt).call(this, n), O(N, this, Kt).call(this, t), O(N, a, Gt).call(a, this);
	else {
		k(Nt, this).clear();
		for (let e of k(Et, this)) e(this);
		k(Et, this).clear(), vt = this, Zt(n), Zt(t), vt = null, (e = k(At, this)) == null || e.resolve();
		var o = j;
		k(Ot, this) === 0 && (k(jt, this).length === 0 || o !== null) && O(N, this, qt).call(this), o !== null && (nn.clear(), O(N, o, Vt).call(o));
	}
}
function Ht(e, t, n) {
	e.f ^= b;
	for (var r = e.first; r !== null;) {
		var i = r.f, a = !!(i & 96);
		if (!(a && i & 1024 || i & 8192 || k(Pt, this).has(r)) && r.fn !== null) {
			a ? r.f ^= b : i & 4 ? t.push(r) : fr(r) && (i & 16 && this.add_dirty_reaction(r, ne), vr(r));
			var o = r.first;
			if (o !== null) {
				r = o;
				continue;
			}
		}
		for (; r !== null;) {
			var s = r.next;
			if (s !== null) {
				r = s;
				break;
			}
			r = r.parent;
		}
	}
}
function Ut() {
	for (var e = this.prev; e !== null; e = e.prev) if (!e.is_fork && O(N, this, Wt).call(this, e)) return e;
	return null;
}
function Wt(e) {
	for (let [t, [, n]] of this.current) if (!n && e.current.has(t)) return !0;
	return !1;
}
function Gt(e) {
	for (let [t, n] of e.current) !this.previous.has(t) && e.previous.has(t) && this.previous.set(t, e.previous.get(t)), this.current.set(t, n);
	for (let [t, n] of e.async_deriveds) {
		let e = this.async_deriveds.get(t);
		e && n.promise.then(e.resolve).catch(e.reject);
	}
	e.async_deriveds.clear(), this.transfer_reactions(k(Nt, e));
	let t = (e) => {
		var n = e.reactions;
		if (n !== null && !(e.f & 2 && !(e.f & 6144))) for (let e of n) {
			var r = e.f;
			if (r & 2) t(e);
			else {
				var i = e;
				r & 4194320 && !this.async_deriveds.has(i) && (k(Nt, this).delete(i), E(i, x), this.schedule(i));
			}
		}
	};
	for (let e of this.current.keys()) t(e);
	this.oncommit(() => e.discard()), O(N, e, qt).call(e), j = this, O(N, this, Vt).call(this);
}
function Kt(e) {
	for (var t = 0; t < e.length; t += 1) $e(e[t], k(Nt, this));
}
function qt() {
	if (this.linked) {
		var e = this.prev, t = this.next;
		e === null || (e.next = t), t === null ? _t = e : t.prev = e, this.linked = !1;
	}
}
function Jt(e) {
	var t = bt, n = vt;
	vt = null, bt = !0;
	try {
		var r;
		for (e && (Jt(), r = e());;) {
			if (Xe(), j === null) return r;
			j.flush();
		}
	} finally {
		bt = t, vt = n;
	}
}
function Yt() {
	try {
		Le();
	} catch (e) {
		Mn(e, yt);
	}
}
var Xt = null;
function Zt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && fr(r) && (Xt = /* @__PURE__ */ new Set(), vr(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && Jn(r), (Xt == null ? void 0 : Xt.size) > 0)) {
				nn.clear();
				for (let e of Xt) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) Xt.has(n) && (Xt.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || vr(n);
					}
				}
				Xt.clear();
			}
		}
		Xt = null;
	}
}
function Qt(e) {
	j.schedule(e);
}
function $t(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), E(e, b);
		for (var n = e.first; n !== null;) $t(n, t), n = n.next;
	}
}
function en(e) {
	E(e, b);
	for (var t = e.first; t !== null;) en(t), t = t.next;
}
// node_modules/svelte/src/internal/client/reactivity/sources.js
var tn = /* @__PURE__ */ new Set(), nn = /* @__PURE__ */ new Map(), rn = !1;
function an(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: Me,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function on(e, t) {
	let n = an(e, t);
	return ar(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function sn(e, t = !1, n = !0) {
	let r = an(e);
	return t || (r.equals = Pe), r;
}
function cn(e, t, n = !1) {
	return L !== null && (!R || L.f & 131072) && Ke() && L.f & 4325394 && (ir === null || !ir.has(e)) && Be(), dn(e, n ? hn(t) : t, Ct);
}
var ln = null, un = 0;
function dn(e, t, n = null) {
	if (!e.equals(t)) {
		tr ? nn.set(e, t) : nn.has(e) || nn.set(e, e.v);
		var r = Lt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && ut(t), M === null && Qe(t);
		}
		e.wv = dr(), ln = null, un = 0, mn(e, x, n), ln = null, Ke() && B !== null && B.f & 1024 && !(B.f & 96) && (U === null ? or([e]) : U.push(e)), !r.is_fork && tn.size > 0 && !rn && fn();
	}
	return t;
}
function fn() {
	rn = !1;
	for (let e of tn) {
		e.f & 1024 && E(e, ne);
		let t;
		try {
			t = fr(e);
		} catch {
			t = !0;
		}
		t && vr(e);
	}
	tn.clear();
}
function pn(e) {
	cn(e, e.v + 1);
}
function mn(e, t, n) {
	var r = e.reactions;
	if (r !== null) {
		var i = Ke(), a = r.length;
		if (un += a, un > 1e5 && ln === null && (ln = /* @__PURE__ */ new Set()), ln !== null) {
			if (ln.has(e)) return;
			ln.add(e);
		}
		for (var o = 0; o < a; o++) {
			var s = r[o], c = s.f;
			if (i || s !== B) {
				var l = (c & x) === 0;
				if (l && E(s, t), c & 131072) tn.add(s);
				else if (c & 2) {
					var u = s;
					M == null || M.delete(u), mn(u, ne, n);
				} else if (l) {
					var d = s;
					c & 16 && Xt !== null && Xt.add(d), n === null ? Qt(d) : n.push(d);
				}
			}
		}
	}
}
function hn(e) {
	if (typeof e != "object" || !e || me in e || he in e) return e;
	let n = f(e);
	if (n !== u && n !== d) return e;
	var i = /* @__PURE__ */ new Map(), a = r(e), o = /* @__PURE__ */ on(0), s = null, l = lr, p = (e) => {
		if (lr === l) return e();
		var t = L, n = lr;
		z(null), ur(l);
		var r = e();
		return z(t), ur(n), r;
	};
	return a && i.set("length", /* @__PURE__ */ on(e.length, s)), new Proxy(e, {
		defineProperty(e, t, n) {
			"value" in n && n.configurable !== !1 && n.enumerable !== !1 && n.writable !== !1 || Re();
			var r = i.get(t);
			return r === void 0 ? p(() => {
				var e = /* @__PURE__ */ on(n.value, s);
				return i.set(t, e), e;
			}) : cn(r, n.value, !0), !0;
		},
		deleteProperty(e, n) {
			var r = i.get(n);
			if (r === void 0) {
				if (n in e) {
					let e = p(() => /* @__PURE__ */ on(t, s));
					i.set(n, e), pn(o);
				}
			} else cn(r, t), pn(o);
			return !0;
		},
		get(n, r, a) {
			var o;
			if (r === me) return e;
			var l = i.get(r), u = r in n;
			if (l === void 0 && (!u || (o = c(n, r)) != null && o.writable) && (l = p(() => /* @__PURE__ */ on(hn(u ? n[r] : t), s)), i.set(r, l)), l !== void 0) {
				var d = W(l);
				return d === t ? void 0 : d;
			}
			return Reflect.get(n, r, a);
		},
		getOwnPropertyDescriptor(e, n) {
			var r;
			(r = this.has) == null || r.call(this, e, n);
			var a = Reflect.getOwnPropertyDescriptor(e, n), o = i.get(n);
			if (o !== void 0) {
				var s = W(o);
				if (s === t) return;
				if (a && "value" in a) a.value = s;
				else return {
					enumerable: !0,
					configurable: !0,
					value: s,
					writable: !0
				};
			}
			return a;
		},
		has(e, n) {
			var r;
			if (n === me) return !0;
			var a = i.get(n), o = a !== void 0 && a.v !== t || Reflect.has(e, n);
			return (a !== void 0 || (B !== null || L !== null) && (!o || (r = c(e, n)) != null && r.writable)) && (a === void 0 && (a = p(() => /* @__PURE__ */ on(o ? hn(e[n]) : t, s)), i.set(n, a)), W(a) === t) ? !1 : o;
		},
		set(e, n, r, l) {
			var u = i.get(n), d = n in e;
			if (a && n === "length") for (var f = r; f < u.v; f += 1) {
				var m = i.get(f + "");
				m === void 0 ? f in e && (m = p(() => /* @__PURE__ */ on(t, s)), i.set(f + "", m)) : cn(m, t);
			}
			if (u === void 0) {
				var h;
				(!d || (h = c(e, n)) != null && h.writable) && (u = p(() => /* @__PURE__ */ on(void 0, s)), cn(u, hn(r)), i.set(n, u));
			} else {
				d = u.v !== t;
				var ee = p(() => hn(r));
				cn(u, ee);
			}
			var g = Reflect.getOwnPropertyDescriptor(e, n);
			if (g != null && g.set && g.set.call(l, r), !d) {
				if (a && typeof n == "string") {
					var _ = i.get("length"), v = Number(n);
					Number.isInteger(v) && v >= _.v && cn(_, v + 1);
				}
				pn(o);
			}
			return !0;
		},
		ownKeys(e) {
			W(o);
			var n = Reflect.ownKeys(e).filter((e) => {
				var n = i.get(e);
				return n === void 0 || n.v !== t;
			});
			for (var [r, a] of i) a.v !== t && !(r in e) && n.push(r);
			return n;
		},
		setPrototypeOf() {
			ze();
		}
	});
}
var gn, _n, vn, yn;
function bn() {
	if (gn === void 0) {
		gn = window, _n = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		vn = c(t, "firstChild").get, yn = c(t, "nextSibling").get, p(e) && (e[ve] = void 0, e[_e] = null, e[ye] = void 0, e.__e = void 0), p(n) && (n[be] = void 0);
	}
}
function P(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function xn(e) {
	return vn.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function Sn(e) {
	return yn.call(e);
}
function Cn(e, t) {
	if (!S) return /* @__PURE__ */ xn(e);
	var n = /* @__PURE__ */ xn(C);
	if (n === null) n = C.appendChild(P());
	else if (t && n.nodeType !== 3) {
		var r = P();
		return n == null || n.before(r), w(r), r;
	}
	return t && An(n), w(n), n;
}
function wn(e, t = !1) {
	if (!S) {
		var n = /* @__PURE__ */ xn(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ Sn(n) : n;
	}
	if (t) {
		if ((C == null ? void 0 : C.nodeType) !== 3) {
			var r = P();
			return C == null || C.before(r), w(r), r;
		}
		An(C);
	}
	return C;
}
function Tn(e, t = !1) {
	if (!S) return /* @__PURE__ */ xn(e);
	var n = Cn(e, t);
	return Oe(e), n;
}
function En(e, t = 1, n = !1) {
	let r = S ? C : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ Sn(r);
	if (!S) return r;
	if (n) {
		if ((r == null ? void 0 : r.nodeType) !== 3) {
			var a = P();
			return r === null ? i == null || i.after(a) : r.before(a), w(a), a;
		}
		An(r);
	}
	return w(r), r;
}
function Dn(e) {
	e.textContent = "";
}
function On() {
	return !1;
}
function kn(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function An(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function jn(e) {
	var t = B;
	if (t === null) return L.f |= pe, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	Mn(e, t);
}
function Mn(t, n) {
	if (t === e) throw t;
	if (!(n !== null && n.f & 16384)) {
		for (; n !== null;) {
			if (n.f & 128 && !(n.f & 33570816)) {
				if (!(n.f & 32768)) throw t;
				try {
					n.b.error(t);
					return;
				} catch (e) {
					t = e;
				}
			}
			n = n.parent;
		}
		throw t;
	}
}
// node_modules/svelte/src/internal/client/reactivity/effects.js
function Nn(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function Pn(e, t) {
	var n = B;
	n !== null && n.f & 8192 && (e |= re);
	var r = {
		ctx: T,
		deps: null,
		nodes: null,
		f: e | x | 512,
		first: null,
		fn: t,
		last: null,
		next: null,
		parent: n,
		b: n && n.b,
		prev: null,
		teardown: null,
		wv: 0,
		ac: null
	};
	j == null || j.register_created_effect(r);
	var i = r;
	if (e & 4) St === null ? Lt.ensure().schedule(r) : St.push(r);
	else if (t !== null) {
		try {
			vr(r);
		} catch (e) {
			throw I(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= se));
	}
	if (i !== null && (i.parent = n, n !== null && Nn(i, n), L !== null && L.f & 2 && !(e & 64))) {
		var a = L;
		(a.effects ??= []).push(i);
	}
	return r;
}
function Fn() {
	return L !== null && !R;
}
function In(e) {
	let t = Pn(8, null);
	return E(t, b), t.teardown = e, t;
}
function Ln(e) {
	return Pn(4 | le, e);
}
function Rn(e) {
	Lt.ensure();
	let t = Pn(64 | ce, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? Yn(t, () => {
			I(t), n(void 0);
		}) : (I(t), n(void 0));
	});
}
function zn(e) {
	return Pn(4, e);
}
function Bn(e) {
	return Pn(fe | ce, e);
}
function Vn(e, t = 0) {
	return Pn(8 | t, e);
}
function Hn(e, t = [], n = [], r = []) {
	tt(r, t, n, (t) => {
		Pn(8, () => {
			e(...t.map(W));
		});
	});
}
function Un(e, t = 0) {
	return Pn(16 | t, e);
}
function F(e) {
	return Pn(32 | ce, e);
}
function Wn(e) {
	var t = e.teardown;
	if (t !== null) {
		let n = tr, r = L;
		nr(!0), z(null);
		try {
			t.call(null);
		} catch (t) {
			Mn(t, e.parent);
		} finally {
			nr(n), z(r);
		}
	}
}
function Gn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && et(() => {
			e.abort(xe);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : I(n, t), n = r;
	}
}
function Kn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || I(t), t = n;
	}
}
function I(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (qn(e.nodes.start, e.nodes.end), n = !0), e.f |= oe, Gn(e, t && !n), _r(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	Wn(e), e.f ^= oe, e.f |= ie;
	var i = e.parent;
	i !== null && i.first !== null && Jn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function qn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ Sn(e);
		e.remove(), e = n;
	}
}
function Jn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Yn(e, t, n = !0) {
	var r = [];
	e.f |= 256, Xn(e, r, !0);
	var i = () => {
		n && I(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function Xn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= re;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				Xn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function Zn(e) {
	e.f &= -257, Qn(e, !0);
}
function Qn(e, t) {
	if (!(e.f & 256) && e.f & 8192) {
		e.f ^= re, e.f & 1024 || (E(e, x), Lt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			Qn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function $n(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ Sn(n);
		t.append(n), n = i;
	}
}
// node_modules/svelte/src/internal/client/legacy.js
var er = null, tr = !1;
function nr(e) {
	tr = e;
}
var L = null, R = !1;
function z(e) {
	L = e;
}
var B = null;
function rr(e) {
	B = e;
}
var ir = null;
function ar(e) {
	L !== null && (L.f & 2097152 || L.f & 2) && (ir ??= /* @__PURE__ */ new Set()).add(e);
}
var V = null, H = 0, U = null;
function or(e) {
	U = e;
}
var sr = 1, cr = 0, lr = cr;
function ur(e) {
	lr = e;
}
function dr() {
	return ++sr;
}
function fr(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (fr(a) && dt(a), a.wv > e.wv) return !0;
		}
		t & 512 && M === null && E(e, b);
	}
	return !1;
}
function pr(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(ir !== null && ir.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? pr(a, t, !1) : t === a && (n ? E(a, x) : a.f & 1024 && E(a, ne), Qt(a));
	}
}
function mr(e) {
	var t = V, n = H, r = U, i = L, a = ir, o = T, s = R, c = lr, l = e.f;
	V = null, H = 0, U = null, L = l & 96 ? null : e, ir = null, He(e.ctx), R = !1, lr = ++cr, e.ac !== null && (et(() => {
		e.ac.abort(xe);
	}), e.ac = null);
	try {
		e.f |= de;
		var u = e.fn, d = u();
		e.f |= ae;
		var f = hr(e);
		if (Ke() && U !== null && !R && f !== null && !(e.f & 6146)) for (var p = 0; p < U.length; p++) pr(U[p], e);
		if (i !== null && i !== e) {
			if (cr++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = cr;
			if (t !== null) for (let e of t) e.rv = cr;
			U !== null && (r === null ? r = U : r.push(...U));
		}
		return e.f & 8388608 && (e.f ^= pe), d;
	} catch (t) {
		return hr(e), jn(t);
	} finally {
		e.f ^= de, V = t, H = n, U = r, L = i, ir = a, He(o), R = s, lr = c;
	}
}
function hr(e) {
	var t = e.deps, n = j == null ? void 0 : j.is_fork;
	if (V !== null) {
		var r;
		if (n || _r(e, H), t !== null && H > 0) for (t.length = H + V.length, r = 0; r < V.length; r++) t[H + r] = V[r];
		else e.deps = t = V;
		if (Fn() && e.f & 512) for (r = H; r < t.length; r++) (t[r].reactions ??= []).push(e);
	} else !n && t !== null && H < t.length && (_r(e, H), t.length = H);
	return t;
}
function gr(e, n) {
	let r = n.reactions;
	if (r !== null) {
		var o = i.call(r, e);
		if (o !== -1) {
			var s = r.length - 1;
			s === 0 ? r = n.reactions = null : (r[o] = r[s], r.pop());
		}
	}
	if (r === null && n.f & 2 && (V === null || !a.call(V, n))) {
		var c = n;
		c.f & 512 && (c.f ^= 512), c.v !== t && Qe(c), c.ac !== null && et(() => {
			c.ac.abort(xe), c.ac = null, E(c, x);
		}), ft(c), _r(c, 0);
	}
}
function _r(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) gr(e, n[r]);
}
function vr(e) {
	var t = e.f;
	if (!(t & 16384)) {
		E(e, b);
		var n = B;
		B = e;
		try {
			t & 16777232 ? Kn(e) : Gn(e), Wn(e);
			var r = mr(e);
			e.teardown = typeof r == "function" ? r : null, e.wv = sr;
		} finally {
			B = n;
		}
	}
}
function W(e) {
	var t = !!(e.f & 2);
	if (er == null || er.add(e), L !== null && !R && !(B !== null && B.f & 16384) && (ir === null || !ir.has(e))) {
		var n = L.deps;
		if (L.f & 2097152) e.rv < cr && (e.rv = cr, V === null && n !== null && n[H] === e ? H++ : V === null ? V = [e] : V.push(e));
		else {
			L.deps ??= [], a.call(L.deps, e) || L.deps.push(e);
			var r = e.reactions;
			r === null ? e.reactions = [L] : a.call(r, L) || r.push(L);
		}
	}
	if (tr && nn.has(e)) return nn.get(e);
	if (t) {
		var i = e;
		if (tr) {
			var o = i.v;
			return (!(i.f & 1024) && i.reactions !== null || br(i)) && (o = ut(i)), nn.set(i, o), o;
		}
		var s = !(i.f & 512) && !R && L !== null && !!(L.f & 512), c = (i.f & ae) === 0;
		fr(i) && (s && (i.f |= 512), dt(i)), s && !c && (pt(i), yr(i));
	}
	if (M != null && M.has(e)) return M.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function yr(e) {
	if (e.f |= 512, e.deps !== null) for (let n of e.deps) {
		var t = n.reactions;
		t === null ? n.reactions = [e] : a.call(t, e) || t.push(e), n.f & 2 && !(n.f & 512) && (pt(n), yr(n));
	}
}
function br(e) {
	if (e.v === t) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (nn.has(t) || t.f & 2 && br(t)) return !0;
	return !1;
}
function xr(e) {
	var t = R;
	try {
		return R = !0, e();
	} finally {
		R = t;
	}
}
function Sr(e) {
	if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
		if (me in e) Cr(e);
		else if (!Array.isArray(e)) for (let t in e) {
			let n = e[t];
			typeof n == "object" && n && me in n && Cr(n);
		}
	}
}
function Cr(e, t = /* @__PURE__ */ new Set()) {
	if (typeof e == "object" && e && !(e instanceof EventTarget) && !t.has(e)) {
		t.add(e), e instanceof Date && e.getTime();
		for (let n in e) try {
			Cr(e[n], t);
		} catch {}
		let n = f(e);
		if (n !== Object.prototype && n !== Array.prototype && n !== Map.prototype && n !== Set.prototype && n !== Date.prototype) {
			let t = l(n);
			for (let n in t) {
				let r = t[n].get;
				if (r) try {
					r.call(e);
				} catch {}
			}
		}
	}
}
// node_modules/svelte/src/internal/client/dom/elements/events.js
var wr = Symbol("events"), Tr = /* @__PURE__ */ new Set(), Er = /* @__PURE__ */ new Set();
function Dr(e, t, n) {
	(t[wr] ??= {})[e] = n;
}
function Or(e) {
	for (var t = 0; t < e.length; t++) Tr.add(e[t]);
	for (var n of Er) n(e);
}
var kr = null, Ar = !1;
function jr(e) {
	var t, n = this, r = n.ownerDocument, i = e.type, a = ((t = e.composedPath) == null ? void 0 : t.call(e)) || [], o = a[0] || e.target;
	kr = e, Ar || (Ar = !0, setTimeout(() => {
		Ar = !1, kr = null;
	}));
	var c = 0, l = kr === e && e[wr];
	if (l) {
		var u = a.indexOf(l);
		if (u !== -1 && (n === document || n === window)) {
			e[wr] = n;
			return;
		}
		var d = a.indexOf(n);
		if (d === -1) return;
		u <= d && (c = u);
	}
	if (o = a[c] || e.target, o !== n) {
		s(e, "currentTarget", {
			configurable: !0,
			get() {
				return o || r;
			}
		});
		var f = L, p = B;
		z(null), rr(null);
		try {
			for (var m, h = []; o !== null && o !== n;) {
				try {
					var ee, g = (ee = o[wr]) == null ? void 0 : ee[i];
					g == null || o.disabled && e.target !== o || g.call(o, e);
				} catch (e) {
					m ? h.push(e) : m = e;
				}
				if (e.cancelBubble) break;
				c++, o = c < a.length ? a[c] : null;
			}
			if (m) {
				for (let e of h) queueMicrotask(() => {
					throw e;
				});
				throw m;
			}
		} finally {
			e[wr] = n, delete e.currentTarget, z(f), rr(p);
		}
	}
}
// node_modules/svelte/src/internal/client/dom/reconciler.js
var Mr, Nr = ((Mr = globalThis) == null || (Mr = Mr.window) == null ? void 0 : Mr.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function Pr(e) {
	return (Nr == null ? void 0 : Nr.createHTML(e)) ?? e;
}
function Fr(e) {
	var t = kn("template");
	return t.innerHTML = Pr(e.replaceAll("<!>", "<!---->")), t.content;
}
// node_modules/svelte/src/internal/client/dom/template.js
function Ir(e, t) {
	var n = B;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function G(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (S) return Ir(C, null), C;
		i === void 0 && (i = Fr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ xn(i)));
		var t = r || _n ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ xn(t), s = t.lastChild;
			Ir(o, s);
		} else Ir(t, t);
		return t;
	};
}
function K(e, t) {
	if (S) {
		var n = B;
		n.f & 32768 && n.nodes.end !== null || (n.nodes.end = C), De();
	} else e !== null && e.before(t);
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var Lr = ["touchstart", "touchmove"];
function Rr(e) {
	return Lr.includes(e);
}
// node_modules/svelte/src/reactivity/create-subscriber.js
function zr(e) {
	let t = 0, n = an(0), r;
	return () => {
		Fn() && (W(n), Vn(() => (t === 0 && (r = xr(() => e(() => pn(n)))), t += 1, () => {
			Ye(() => {
				--t, t === 0 && (r == null || r(), r = void 0, pn(n));
			});
		})));
	};
}
// node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var Br = se | ce;
function Vr(e, t, n, r) {
	new Qr(e, t, n, r);
}
var q = /* @__PURE__ */ new WeakMap(), Hr = /* @__PURE__ */ new WeakMap(), Ur = /* @__PURE__ */ new WeakMap(), Wr = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakMap(), Gr = /* @__PURE__ */ new WeakMap(), Kr = /* @__PURE__ */ new WeakMap(), qr = /* @__PURE__ */ new WeakMap(), Jr = /* @__PURE__ */ new WeakMap(), Yr = /* @__PURE__ */ new WeakMap(), Xr = /* @__PURE__ */ new WeakMap(), Zr = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakSet(), Qr = class {
	constructor(e, t, n, r) {
		var i;
		ht(this, Q), y(this, "parent", void 0), y(this, "is_pending", !1), y(this, "transform_error", void 0), D(this, q, void 0), D(this, Hr, S ? C : null), D(this, Ur, void 0), D(this, Wr, void 0), D(this, J, void 0), D(this, Y, null), D(this, X, null), D(this, Z, null), D(this, Gr, null), D(this, Kr, 0), D(this, qr, 0), D(this, Jr, !1), D(this, Yr, /* @__PURE__ */ new Map()), D(this, Xr, null), D(this, Zr, zr(() => (A(Xr, this, an(k(Kr, this))), () => {
			A(Xr, this, null);
		}))), A(q, this, e), A(Ur, this, t), A(Wr, this, (e) => {
			var t = B;
			t.b = this, t.f |= 128, n(e);
		}), this.parent = B.b, this.transform_error = r ?? ((i = this.parent) == null ? void 0 : i.transform_error) ?? ((e) => e), A(J, this, Un(() => {
			if (S) {
				let e = je(k(Hr, this));
				De();
				let t = e === "[!";
				if (e.startsWith("[?")) {
					let t = JSON.parse(e.slice(2));
					O(Q, this, ei).call(this, t);
				} else t ? O(Q, this, ri).call(this) : O(Q, this, $r).call(this);
			} else O(Q, this, ii).call(this);
		}, Br)), S && A(q, this, C);
	}
	defer_effect(e) {
		$e(e, k(Yr, this));
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!k(Ur, this).pending;
	}
	update_pending_count(e, t) {
		O(Q, this, si).call(this, e, t), A(Kr, this, k(Kr, this) + e), k(Xr, this) && !k(Jr, this) && (A(Jr, this, !0), Ye(() => {
			A(Jr, this, !1), k(Xr, this) && dn(k(Xr, this), k(Kr, this));
		}));
	}
	get_effect_pending() {
		return k(Zr, this).call(this), W(k(Xr, this));
	}
	error(t) {
		if (t === e || !k(Ur, this).onerror && !k(Ur, this).failed) throw t;
		j != null && j.is_fork ? (k(Y, this) && j.skip_effect(k(Y, this)), k(X, this) && j.skip_effect(k(X, this)), k(Z, this) && j.skip_effect(k(Z, this)), j.oncommit(() => {
			O(Q, this, ni).call(this) || O(Q, this, ci).call(this, t);
		})) : O(Q, this, ci).call(this, t);
	}
};
function $r() {
	try {
		A(Y, this, F(() => k(Wr, this).call(this, k(q, this))));
	} catch (e) {
		this.error(e);
	}
}
function ei(e) {
	let t = k(Ur, this).failed, { reset: n, invoke_onerror: r } = O(Q, this, ti).call(this, e);
	Ye(r), t && A(Z, this, F(() => {
		t(k(q, this), () => e, () => n);
	}));
}
function ti(e) {
	var t = !1, n = !1;
	let r = () => {
		O(Q, this, ni).call(this) || (t ? Te() : (t = !0, n && Ve(), k(Z, this) !== null && Yn(k(Z, this), () => {
			A(Z, this, null);
		}), O(Q, this, oi).call(this, () => {
			O(Q, this, ii).call(this);
		})));
	};
	return {
		reset: r,
		invoke_onerror: () => {
			if (!O(Q, this, ni).call(this)) try {
				var t, i;
				n = !0, (t = (i = k(Ur, this)).onerror) == null || t.call(i, e, r), n = !1;
			} catch (e) {
				Mn(e, k(J, this) && k(J, this).parent);
			}
		}
	};
}
function ni() {
	return (k(J, this).f & (ie | oe)) !== 0;
}
function ri() {
	let e = k(Ur, this).pending;
	e && (this.is_pending = !0, A(X, this, F(() => e(k(q, this)))), Ye(() => {
		if (!O(Q, this, ni).call(this)) {
			var e = A(Gr, this, document.createDocumentFragment()), t = P(), n = !1;
			e.append(t), A(Y, this, O(Q, this, oi).call(this, () => {
				try {
					return F(() => k(Wr, this).call(this, t));
				} catch (e) {
					try {
						this.error(e), n = !0;
					} catch (e) {
						Mn(e, k(J, this).parent);
					}
					return null;
				}
			})), k(Y, this) === null ? (A(Gr, this, null), n && O(Q, this, ai).call(this, j)) : k(qr, this) === 0 && (k(q, this).before(e), A(Gr, this, null), Yn(k(X, this), () => {
				A(X, this, null);
			}), O(Q, this, ai).call(this, j));
		}
	}));
}
function ii() {
	try {
		if (this.is_pending = this.has_pending_snippet(), A(qr, this, 0), A(Kr, this, 0), A(Y, this, F(() => {
			k(Wr, this).call(this, k(q, this));
		})), k(qr, this) > 0) {
			var e = A(Gr, this, document.createDocumentFragment());
			$n(k(Y, this), e);
			let t = k(Ur, this).pending;
			A(X, this, F(() => t(k(q, this))));
		} else O(Q, this, ai).call(this, j);
	} catch (e) {
		this.error(e);
	}
}
function ai(e) {
	this.is_pending = !1, e.transfer_reactions(k(Yr, this));
}
function oi(e) {
	var t = B, n = L, r = T;
	rr(k(J, this)), z(k(J, this)), He(k(J, this).ctx);
	try {
		return Lt.ensure(), e();
	} finally {
		rr(t), z(n), He(r);
	}
}
function si(e, t) {
	if (this.has_pending_snippet()) A(qr, this, k(qr, this) + e), k(qr, this) === 0 && (O(Q, this, ai).call(this, t), k(X, this) && Yn(k(X, this), () => {
		A(X, this, null);
	}), k(Gr, this) && (k(q, this).before(k(Gr, this)), A(Gr, this, null)));
	else if (this.parent) {
		var n;
		O(Q, n = this.parent, si).call(n, e, t);
	}
}
function ci(e) {
	k(Y, this) && (I(k(Y, this)), A(Y, this, null)), k(X, this) && (I(k(X, this)), A(X, this, null)), k(Z, this) && (I(k(Z, this)), A(Z, this, null)), S && (w(k(Hr, this)), ke(), w(Ae()));
	let t = k(Ur, this).failed, n = (e) => {
		if (O(Q, this, ni).call(this)) return;
		let { reset: n, invoke_onerror: r } = O(Q, this, ti).call(this, e);
		r(), t && !O(Q, this, ni).call(this) && A(Z, this, O(Q, this, oi).call(this, () => {
			try {
				return F(() => {
					var r = B;
					r.b = this, r.f |= 128, t(k(q, this), () => e, () => n);
				});
			} catch (e) {
				return Mn(e, k(J, this).parent), null;
			}
		}));
	};
	Ye(() => {
		if (!O(Q, this, ni).call(this)) {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				Mn(e, k(J, this) && k(J, this).parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => Mn(e, k(J, this) && k(J, this).parent)) : n(t);
		}
	});
}
function li(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[be] ??= e.nodeValue) && (e[be] = n, e.nodeValue = `${n}`);
}
function ui(e, t) {
	return fi(e, t);
}
var di = /* @__PURE__ */ new Map();
function fi(t, { target: n, anchor: r, props: i = {}, events: a, context: s, intro: c = !0, transformError: l }) {
	bn();
	var u = void 0, d = Rn(() => {
		var c = r ?? n.appendChild(P());
		Vr(c, { pending: () => {} }, (n) => {
			Ue({});
			var r = T;
			if (s && (r.c = s), a && (i.$$events = a), S && Ir(n, null), u = t(n, i) || Ge(), S && (B.nodes.end = C, C === null || C.nodeType !== 8 || C.data !== "]")) throw we(), e;
			We();
		}, l);
		var d = /* @__PURE__ */ new Set(), f = (e) => {
			for (var t = 0; t < e.length; t++) {
				var r = e[t];
				if (!d.has(r)) {
					d.add(r);
					var i = Rr(r);
					for (let e of [n, document]) {
						var a = di.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), di.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, jr, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return f(o(Tr)), Er.add(f), () => {
			for (var e of d) for (let r of [n, document]) {
				var t = di.get(r), i = t.get(e);
				--i == 0 ? (r.removeEventListener(e, jr), t.delete(e), t.size === 0 && di.delete(r)) : t.set(e, i);
			}
			if (Er.delete(f), c !== r) {
				var a;
				(a = c.parentNode) == null || a.removeChild(c);
			}
		};
	});
	return pi.set(u, d), u;
}
var pi = /* @__PURE__ */ new WeakMap();
function mi(e, t) {
	let n = pi.get(e);
	return n ? (pi.delete(e), n(t)) : Promise.resolve();
}
// node_modules/svelte/src/internal/client/dom/blocks/branches.js
var hi = /* @__PURE__ */ new WeakMap(), gi = /* @__PURE__ */ new WeakMap(), $ = /* @__PURE__ */ new WeakMap(), _i = /* @__PURE__ */ new WeakMap(), vi = /* @__PURE__ */ new WeakMap(), yi = /* @__PURE__ */ new WeakMap(), bi = /* @__PURE__ */ new WeakMap(), xi = class {
	constructor(e, t = !0) {
		y(this, "anchor", void 0), D(this, hi, /* @__PURE__ */ new Map()), D(this, gi, /* @__PURE__ */ new Map()), D(this, $, /* @__PURE__ */ new Map()), D(this, _i, /* @__PURE__ */ new Set()), D(this, vi, !0), D(this, yi, (e) => {
			if (k(hi, this).has(e)) {
				var t = k(hi, this).get(e), n = k(gi, this).get(t);
				if (n) Zn(n), k(_i, this).delete(t);
				else {
					var r = k($, this).get(t);
					r && (Zn(r.effect), k(gi, this).set(t, r.effect), k($, this).delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
				}
				for (let [t, n] of k(hi, this)) {
					if (k(hi, this).delete(t), t === e) break;
					let r = k($, this).get(n);
					r && (I(r.effect), k($, this).delete(n));
				}
				for (let [e, r] of k(gi, this)) {
					if (e === t || k(_i, this).has(e)) continue;
					let i = () => {
						if (Array.from(k(hi, this).values()).includes(e)) {
							var t = document.createDocumentFragment();
							$n(r, t), t.append(P()), k($, this).set(e, {
								effect: r,
								fragment: t
							});
						} else I(r);
						k(_i, this).delete(e), k(gi, this).delete(e);
					};
					k(vi, this) || !n ? (k(_i, this).add(e), Yn(r, i, !1)) : i();
				}
			}
		}), D(this, bi, (e) => {
			k(hi, this).delete(e);
			let t = Array.from(k(hi, this).values());
			for (let [e, n] of k($, this)) t.includes(e) || (I(n.effect), k($, this).delete(e));
		}), this.anchor = e, A(vi, this, t);
	}
	ensure(e, t) {
		var n = j, r = On();
		if (t && !k(gi, this).has(e) && !k($, this).has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = P();
				i.append(a), k($, this).set(e, {
					effect: F(() => t(a)),
					fragment: i
				});
			} else k(gi, this).set(e, F(() => t(this.anchor)));
		}
		if (k(hi, this).set(n, e), r) {
			for (let [t, r] of k(gi, this)) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of k($, this)) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(k(yi, this)), n.ondiscard(k(bi, this));
		} else S && (this.anchor = C), k(yi, this).call(this, n);
	}
};
// node_modules/svelte/src/internal/client/dom/blocks/if.js
function Si(e, t, n = !1) {
	var r;
	S && (r = C, De());
	var i = new xi(e), a = n ? se : 0;
	function o(e, t) {
		if (S) {
			var n = je(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Ae();
				w(a), i.anchor = a, Ee(!1), i.ensure(e, t), Ee(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	Un(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
// node_modules/svelte/src/internal/client/dom/blocks/each.js
function Ci(e, t) {
	return t;
}
function wi(e, t, n) {
	for (var r = [], i = t.length, a, s = t.length, c = 0; c < i; c++) {
		let n = t[c];
		Yn(n, () => {
			if (a) {
				if (a.pending.delete(n), a.done.add(n), a.pending.size === 0) {
					var t = e.outrogroups;
					Ti(e, o(a.done)), t.delete(a), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = r.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			Dn(d), d.append(u), e.items.clear();
		}
		Ti(e, t, !l);
	} else a = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(a);
}
function Ti(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r != null && r.has(a) ? (a.f |= ue, $n(a, document.createDocumentFragment())) : I(t[i], n);
	}
}
var Ei;
function Di(e, t, n, i, a, s = null) {
	var c = e, l = /* @__PURE__ */ new Map();
	if (t & 4) {
		var u = e;
		c = S ? w(/* @__PURE__ */ xn(u)) : u.appendChild(P());
	}
	S && De();
	var d = null, f = /* @__PURE__ */ ct(() => {
		var e = n();
		return r(e) ? e : e == null ? [] : o(e);
	}), p = /* @__PURE__ */ new Map(), m = !0;
	function h(e) {
		if (!(g.effect.f & 16384)) {
			g.pending.delete(e);
			var n = W(f);
			g.fallback = d, ki(g, n, c, t, i), d !== null && (n.length === 0 ? d.f & 33554432 ? (d.f ^= ue, ji(d, null, c)) : Zn(d) : Yn(d, () => {
				d = null;
			}));
		}
	}
	function ee(e) {
		g.pending.delete(e);
	}
	var g = {
		effect: Un(() => {
			var e = W(f), r = e.length;
			let o = !1;
			S && je(c) === "[!" != (r === 0) && (c = Ae(), w(c), Ee(!1), o = !0);
			for (var u = /* @__PURE__ */ new Set(), g = j, _ = On(), v = 0; v < r; v += 1) {
				S && C.nodeType === 8 && C.data === "]" && (c = C, o = !0, Ee(!1));
				var y = e[v], te = i(y, v), b = m ? null : l.get(te);
				b ? (b.v && dn(b.v, y), b.i && dn(b.i, v), _ && g.unskip_effect(b.e)) : (b = Ai(l, m ? c : Ei ??= P(), y, te, v, a, t, n), m || (b.e.f |= ue), l.set(te, b)), u.add(te);
			}
			if (r === 0 && s && !d && (m ? d = F(() => s(c)) : (d = F(() => s(Ei ??= P())), d.f |= ue)), r > u.size && Ie("", "", ""), S && r > 0 && w(Ae()), !m) {
				if (p.set(g, u), _) {
					for (let [e, t] of l) u.has(e) || g.skip_effect(t.e);
					g.oncommit(h), g.ondiscard(ee);
				} else h(g);
			}
			o && Ee(!0), W(f);
		}),
		flags: t,
		items: l,
		pending: p,
		outrogroups: null,
		fallback: d
	};
	m = !1, S && (c = C);
}
function Oi(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function ki(e, t, n, r, i) {
	var a = !!(r & 8), s = t.length, c = e.items, l = Oi(e.effect.first), u, d = null, f, p = [], m = [], h, ee, g, _;
	if (a) {
		for (_ = 0; _ < s; _ += 1) if (h = t[_], ee = i(h, _), g = c.get(ee).e, !(g.f & 33554432)) {
			var v;
			(v = g.nodes) == null || (v = v.a) == null || v.measure(), (f ??= /* @__PURE__ */ new Set()).add(g);
		}
	}
	for (_ = 0; _ < s; _ += 1) {
		if (h = t[_], ee = i(h, _), g = c.get(ee).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(g), t.done.delete(g);
		if (g.f & 8192 && (Zn(g), a)) {
			var y;
			(y = g.nodes) == null || (y = y.a) == null || y.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(g);
		}
		if (g.f & 33554432) {
			if (g.f ^= ue, g === l) ji(g, null, n);
			else {
				var te = d ? d.next : l;
				g === e.effect.last && (e.effect.last = g.prev), g.prev && (g.prev.next = g.next), g.next && (g.next.prev = g.prev), Mi(e, d, g), Mi(e, g, te), ji(g, te, n), d = g, p = [], m = [], l = Oi(d.next);
				continue;
			}
		}
		if (g !== l) {
			if (u !== void 0 && u.has(g)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var ne = p[0], re = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) ji(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					Mi(e, ne.prev, re.next), Mi(e, d, ne), Mi(e, re, b), l = b, d = re, --_, p = [], m = [];
				} else u.delete(g), ji(g, l, n), Mi(e, g.prev, g.next), Mi(e, g, d === null ? e.effect.first : d.next), Mi(e, d, g), d = g;
				continue;
			}
			for (p = [], m = []; l !== null && l !== g;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = Oi(l.next);
			if (l === null) continue;
		}
		g.f & 33554432 || p.push(g), d = g, l = Oi(g.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) if (t.pending.size === 0) {
			var ie;
			Ti(e, o(t.done)), (ie = e.outrogroups) == null || ie.delete(t);
		}
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var ae = [];
		if (u !== void 0) for (g of u) g.f & 8192 || ae.push(g);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && ae.push(l), l = Oi(l.next);
		var oe = ae.length;
		if (oe > 0) {
			var se = r & 4 && s === 0 ? n : null;
			if (a) {
				for (_ = 0; _ < oe; _ += 1) {
					var ce;
					(ce = ae[_].nodes) == null || (ce = ce.a) == null || ce.measure();
				}
				for (_ = 0; _ < oe; _ += 1) {
					var le;
					(le = ae[_].nodes) == null || (le = le.a) == null || le.fix();
				}
			}
			wi(e, ae, se);
		}
	}
	a && Ye(() => {
		if (f !== void 0) for (g of f) {
			var e;
			(e = g.nodes) == null || (e = e.a) == null || e.apply();
		}
	});
}
function Ai(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? an(n) : /* @__PURE__ */ sn(n, !1, !1) : null, l = o & 2 ? an(i) : null;
	return {
		v: c,
		i: l,
		e: F(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function ji(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ Sn(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function Mi(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
// node_modules/svelte/src/internal/client/dom/elements/actions.js
function Ni(e, t, n) {
	zn(() => {
		var r = xr(() => t(e, n == null ? void 0 : n()) || {});
		if (n && r != null && r.update) {
			var i = !1, a = {};
			Vn(() => {
				var e = n();
				Sr(e), i && Ne(a, e) && (a = e, r.update(e));
			}), i = !0;
		}
		if (r != null && r.destroy) return () => r.destroy();
	});
}
// node_modules/svelte/src/internal/shared/attributes.js
var Pi = [..." 	\n\r\f\xA0\v﻿"];
function Fi(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Pi.includes(r[o - 1])) && (s === r.length || Pi.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
// node_modules/svelte/src/internal/client/dom/elements/class.js
function Ii(e, t, n, r, i, a) {
	var o = e[ve];
	if (S || o !== n || o === void 0) {
		var s = Fi(n, r, a);
		S && s === e.getAttribute("class") || (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[ve] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
// node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Li = Symbol("is custom element"), Ri = Symbol("is html"), zi = Se ? "link" : "LINK";
function Bi(e, t, n, r) {
	var i = Vi(e);
	if (!(S && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === zi))) {
		var a = i[t];
		a !== (i[t] = n) && (t === "loading" && (e[ge] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && Ui(e).has(t) ? e[t] = n : (!S || typeof n != "number" && typeof n != "boolean" || a !== String(n)) && e.setAttribute(t, n));
	}
}
function Vi(e) {
	return e[_e] ??= {
		[Li]: e.nodeName.includes("-"),
		[Ri]: e.namespaceURI === n
	};
}
var Hi = /* @__PURE__ */ new Map();
function Ui(e) {
	var t = e.getAttribute("is") || e.nodeName, n = Hi.get(t);
	if (n) return n;
	Hi.set(t, n = /* @__PURE__ */ new Set());
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var o in r = l(i), r) r[o].set && o !== "innerHTML" && o !== "textContent" && o !== "innerText" && n.add(o);
		i = f(i);
	}
	return n;
}
// node_modules/svelte/src/internal/client/dom/elements/bindings/size.js
var Wi, Gi = /* @__PURE__ */ new WeakMap(), Ki = /* @__PURE__ */ new WeakMap(), qi = /* @__PURE__ */ new WeakMap(), Ji = /* @__PURE__ */ new WeakSet(), Yi = class {
	constructor(e) {
		ht(this, Ji), D(this, Gi, /* @__PURE__ */ new WeakMap()), D(this, Ki, void 0), D(this, qi, void 0), A(qi, this, e);
	}
	observe(e, t) {
		var n = k(Gi, this).get(e) || /* @__PURE__ */ new Set();
		return n.add(t), k(Gi, this).set(e, n), O(Ji, this, Xi).call(this).observe(e, k(qi, this)), () => {
			var n = k(Gi, this).get(e);
			n.delete(t), n.size === 0 && (k(Gi, this).delete(e), k(Ki, this).unobserve(e));
		};
	}
};
Wi = Yi;
function Xi() {
	return k(Ki, this) ?? A(Ki, this, new ResizeObserver((e) => {
		for (var t of e) {
			Wi.entries.set(t.target, t);
			for (var n of k(Gi, this).get(t.target) || []) n(t);
		}
	}));
}
// node_modules/svelte/src/internal/disclose-version.js
y(Yi, "entries", /* @__PURE__ */ new WeakMap()), typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
// src/ui/loredeck-workbench/LorecardRow.svelte
var Zi = /* @__PURE__ */ G("<span role=\"checkbox\"> </span>"), Qi = /* @__PURE__ */ G("<span class=\"saga-loredeck-workbench-select-cell\"><!></span>"), $i = /* @__PURE__ */ G("<span class=\"saga-lore-workbench-cell-sub\"> </span>"), ea = /* @__PURE__ */ G("<div class=\"saga-lore-workbench-cell\"><span class=\"saga-lore-workbench-cell-main\"> </span> <!></div>"), ta = /* @__PURE__ */ G("<button type=\"button\"><!> <!></button>");
function na(e, t) {
	Ue(t, !0);
	var n = ta();
	let r;
	var i = Cn(n), a = (e) => {
		var n = Qi(), r = Cn(n), i = (e) => {
			var n = Zi();
			let r;
			var i = Tn(n, !0);
			Ni(n, (e, n) => {
				var r, i;
				return (r = (i = t.actions).tooltip) == null ? void 0 : r.call(i, e, n);
			}, () => t.descriptor.checked ? "Remove this Lorecard from bulk selection." : "Add this Lorecard to bulk selection."), Hn(() => {
				r = Ii(n, 1, "saga-loredeck-workbench-select-box", null, r, { "saga-loredeck-workbench-select-box-checked": t.descriptor.checked }), Bi(n, "aria-checked", t.descriptor.checked ? "true" : "false"), li(i, t.descriptor.checked ? "x" : "");
			}), Dr("click", n, (e) => {
				e.stopPropagation(), t.actions.toggleRow(t.descriptor.row.id, e);
			}), K(e, n);
		};
		Si(r, (e) => {
			t.descriptor.row.draft || e(i);
		}), Oe(n), K(e, n);
	};
	Si(i, (e) => {
		t.editable && e(a);
	}), Di(En(i, 2), 17, () => t.descriptor.cells, Ci, (e, t) => {
		var n = ea(), r = Cn(n), i = Tn(r, !0), a = En(r, 2), o = (e) => {
			var n = $i(), r = Tn(n, !0);
			Hn((e) => li(r, e), [() => String(W(t).subText)]), K(e, n);
		};
		Si(a, (e) => {
			W(t).subText && e(o);
		}), Oe(n), Hn((e) => li(i, e), [() => String(W(t).text || "unset")]), K(e, n);
	}), Oe(n), Ni(n, (e, n) => {
		var r, i;
		return (r = (i = t.actions).tooltip) == null ? void 0 : r.call(i, e, n);
	}, () => {
		var e;
		return `Inspect ${((e = t.descriptor.row.entry) == null ? void 0 : e.title) || t.descriptor.row.id}.`;
	}), Hn(() => r = Ii(n, 1, "saga-lore-workbench-row saga-lore-workbench-entry-row saga-loredeck-workbench-entry-row", null, r, {
		"saga-loredeck-workbench-draft-row": t.descriptor.row.draft,
		"saga-loredeck-workbench-disabled-row": t.descriptor.row.disabled,
		"saga-loredeck-workbench-row-selected": t.descriptor.checked,
		"saga-lore-workbench-row-active": t.descriptor.active
	})), Dr("click", n, (e) => t.actions.inspectRow(t.descriptor.row.id, e)), K(e, n), We();
}
Or(["click"]);
// src/ui/loredeck-workbench/imperative-leaf.js
function ra(e, t) {
	let n = t, r = n.mount(e, n.model);
	return {
		update(t) {
			t.key === n.key ? (n = t, r.update(t.model)) : (r.dispose(), r = null, n = t, r = t.mount(e, t.model));
		},
		destroy() {
			r == null || r.dispose(), r = null;
		}
	};
}
// src/ui/loredeck-workbench/DetailLeaf.svelte
var ia = /* @__PURE__ */ G("<div></div>");
function aa(e, t) {
	Ue(t, !0);
	let n = (e) => {
		var t, n;
		return JSON.stringify([
			e.packId,
			((t = e.selectedRow) == null ? void 0 : t.id) ?? null,
			(n = e.selectedRow) != null && n.draft ? "draft" : "entry",
			e.editable
		]);
	};
	var r = ia();
	let i;
	Ni(r, (e, t) => ra == null ? void 0 : ra(e, t), () => ({
		key: n(t.snapshot),
		model: t.snapshot,
		mount: t.actions.mountDetail
	})), Hn(() => i = Ii(r, 1, "saga-lore-workbench-detail saga-loredeck-workbench-detail", null, i, { "saga-loredeck-workbench-editor-detail": t.snapshot.editable && !!t.snapshot.selectedRow })), K(e, r), We();
}
// src/ui/loredeck-workbench/LorecardsView.svelte
var oa = /* @__PURE__ */ G("<div class=\"saga-lore-empty\">Loading Lorecards...</div>"), sa = /* @__PURE__ */ G("<div class=\"saga-lore-empty\"> </div>"), ca = /* @__PURE__ */ G("<div class=\"saga-loredeck-workbench-bulk-toolbar\"></div>"), la = /* @__PURE__ */ G("<div class=\"saga-lore-empty\">No Lorecards match the current filters.</div>"), ua = /* @__PURE__ */ G("<div class=\"saga-lore-workbench-row-note\"> </div>"), da = /* @__PURE__ */ G("<!> <div class=\"saga-lore-workbench-main saga-loredeck-workbench-main\"><div><div class=\"saga-lore-workbench-row saga-lore-workbench-row-header\"></div> <!> <!></div> <!></div>", 1), fa = /* @__PURE__ */ G("<div class=\"saga-lore-workbench-controls saga-loredeck-workbench-controls\"></div> <!>", 1);
function pa(e, t) {
	Ue(t, !0);
	var n = fa(), r = wn(n);
	Ni(r, (e, t) => ra == null ? void 0 : ra(e, t), () => ({
		key: t.bridge.snapshot.packId,
		model: t.bridge.snapshot,
		mount: t.actions.mountControls
	}));
	var i = En(r, 2), a = (e) => {
		K(e, oa());
	}, o = (e) => {
		var n = sa(), r = Tn(n, !0);
		Hn(() => li(r, t.bridge.snapshot.error)), K(e, n);
	}, s = (e) => {
		var n = da(), r = wn(n), i = (e) => {
			var n = ca();
			Ni(n, (e, t) => ra == null ? void 0 : ra(e, t), () => ({
				key: t.bridge.snapshot.packId,
				model: t.bridge.snapshot,
				mount: t.actions.mountBulkToolbar
			})), K(e, n);
		};
		Si(r, (e) => {
			t.bridge.snapshot.editable && e(i);
		});
		var a = En(r, 2), o = Cn(a);
		let s;
		var c = Cn(o);
		Ni(c, (e, t) => ra == null ? void 0 : ra(e, t), () => ({
			key: JSON.stringify([t.bridge.snapshot.packId, t.bridge.snapshot.editable]),
			model: t.bridge.snapshot,
			mount: t.actions.mountTableHeader
		}));
		var l = En(c, 2);
		Di(l, 17, () => t.bridge.snapshot.displayRows, (e) => e.key, (e, n) => {
			na(e, {
				get descriptor() {
					return W(n);
				},
				get actions() {
					return t.actions;
				},
				get editable() {
					return t.bridge.snapshot.editable;
				}
			});
		});
		var u = En(l, 2), d = (e) => {
			K(e, la());
		}, f = (e) => {
			var n = ua(), r = Tn(n);
			Hn(() => li(r, `Showing ${t.bridge.snapshot.displayRows.length ?? ""} of ${t.bridge.snapshot.logicalRows.length ?? ""}. Narrow search or filters to inspect more.`)), K(e, n);
		};
		Si(u, (e) => {
			t.bridge.snapshot.logicalRows.length ? t.bridge.snapshot.displayRows.length < t.bridge.snapshot.logicalRows.length && e(f, 1) : e(d);
		}), Oe(o), aa(En(o, 2), {
			get snapshot() {
				return t.bridge.snapshot;
			},
			get actions() {
				return t.actions;
			}
		}), Oe(a), Hn(() => s = Ii(o, 1, "saga-lore-workbench-table saga-loredeck-workbench-table", null, s, { "saga-loredeck-workbench-selectable-table": t.bridge.snapshot.editable })), K(e, n);
	};
	Si(i, (e) => {
		t.bridge.snapshot.cacheStatus === "loading" ? e(a) : t.bridge.snapshot.error ? e(o, 1) : e(s, -1);
	}), K(e, n), We();
}
// src/ui/loredeck-workbench/adapter.svelte.js
function ma(e, t, n) {
	let r = /* @__PURE__ */ on(t), i = null, a = !1, o = /* @__PURE__ */ new Set(), s = { get snapshot() {
		return W(r);
	} }, c = (e) => {
		try {
			let t = e();
			return t && typeof t.then == "function" ? Promise.resolve(t).catch(n.onError) : t;
		} catch (e) {
			n.onError(e);
		}
	}, l = { ...n }, u = (e) => {
		for (let t of [...o]) e(t) && t.dispose();
	};
	for (let e of [
		"inspectRow",
		"toggleRow",
		"toggleHeader",
		"setQuery",
		"setFilter"
	]) l[e] = (...t) => c(() => n[e](...t));
	for (let e of [
		"mountControls",
		"mountBulkToolbar",
		"mountTableHeader",
		"mountDetail"
	]) l[e] = (t, r) => {
		let i;
		try {
			i = n[e](t, r);
		} catch (e) {
			throw u(() => !0), e;
		}
		let a = !0, s = {
			name: e,
			update: (e) => {
				a && c(() => i.update(e));
			},
			dispose() {
				a && (a = !1, o.delete(s), c(() => i.dispose()));
			}
		};
		return o.add(s), s;
	};
	l.tooltip = (e, t) => {
		let r;
		try {
			r = n.tooltip(e, t);
		} catch (e) {
			throw u(() => !0), e;
		}
		return {
			update: (e) => c(() => {
				var t;
				return r == null || (t = r.update) == null ? void 0 : t.call(r, e);
			}),
			destroy: () => c(() => {
				var e;
				return r == null || (e = r.destroy) == null ? void 0 : e.call(r);
			})
		};
	};
	function d() {
		a || (a = !0, u(() => !0), i && mi(i, { outro: !1 }).catch(n.onError), i = null, cn(r, null));
	}
	try {
		i = ui(pa, {
			target: e,
			props: {
				bridge: s,
				actions: l
			},
			intro: !1
		}), Jt();
	} catch (e) {
		throw d(), n.onError(e), e;
	}
	return {
		update(e) {
			if (!a) try {
				let t = e.cacheStatus === "loading" || !!e.error;
				u((n) => n.name !== "mountControls" && (t || n.name === "mountBulkToolbar" && !e.editable)), Jt(() => {
					cn(r, e);
				});
			} catch (e) {
				d(), n.onError(e);
			}
		},
		dispose: d
	};
}
export { ma as mount };
