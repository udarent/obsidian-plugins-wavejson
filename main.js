var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.js
var main_exports = {};
__export(main_exports, {
  default: () => WaveJSONPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// ../TimingBench/src/core/ir.js
var Core = function() {
  "use strict";
  var BUS = /[=2-9]/, LEVEL = /[01xzud]/, CLOCK = /[pPnNhHlL]/;
  var ALL = ["0", "1", "x", "z", "u", "d", "p", "P", "n", "N", "h", "l", "H", "L", "=", "2", "3", "4", "5", "6", "7", "8", "9"];
  function Parser(src) {
    this.s = src;
    this.i = 0;
  }
  Parser.prototype.ws = function() {
    while (this.i < this.s.length) {
      var c = this.s[this.i];
      if (/\s/.test(c)) {
        this.i++;
        continue;
      }
      if (c === "/" && this.s[this.i + 1] === "/") {
        while (this.i < this.s.length && this.s[this.i] !== "\n") this.i++;
        continue;
      }
      if (c === "/" && this.s[this.i + 1] === "*") {
        this.i += 2;
        while (this.i < this.s.length && !(this.s[this.i] === "*" && this.s[this.i + 1] === "/")) this.i++;
        this.i += 2;
        continue;
      }
      break;
    }
  };
  Parser.prototype.err = function(m) {
    var e = new Error(m + " @" + this.i);
    e.pos = this.i;
    throw e;
  };
  Parser.prototype.value = function() {
    this.ws();
    var s = this.i, c = this.s[this.i];
    if (c === "{") return this.obj();
    if (c === "[") return this.arr();
    if (c === '"' || c === "'") return this.str();
    if (c === "-" || /[0-9]/.test(c)) {
      var m = /^-?\d+(?:\.\d+)?/.exec(this.s.slice(this.i));
      if (!m) this.err("bad number");
      this.i += m[0].length;
      return { k: "num", v: Number(m[0]), s, e: this.i };
    }
    var id = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i));
    if (id) {
      this.i += id[0].length;
      var v = id[0] === "true" ? true : id[0] === "false" ? false : id[0];
      return { k: "id", v, s, e: this.i };
    }
    this.err("unexpected token " + c);
  };
  Parser.prototype.str = function() {
    var q = this.s[this.i], s = this.i;
    this.i++;
    var out = "";
    var escMap = { n: "\n", r: "\r", t: "	", b: "\b", f: "\f", v: "\v", "0": "\0" };
    while (this.i < this.s.length) {
      var c = this.s[this.i++];
      if (c === "\\") {
        var n = this.s[this.i++];
        if (n === "u") {
          var h = this.s.slice(this.i, this.i + 4);
          if (/^[0-9a-fA-F]{4}$/.test(h)) {
            out += String.fromCharCode(parseInt(h, 16));
            this.i += 4;
          } else out += n;
          continue;
        }
        if (n === "x") {
          var h2 = this.s.slice(this.i, this.i + 2);
          if (/^[0-9a-fA-F]{2}$/.test(h2)) {
            out += String.fromCharCode(parseInt(h2, 16));
            this.i += 2;
          } else out += n;
          continue;
        }
        out += Object.prototype.hasOwnProperty.call(escMap, n) ? escMap[n] : n;
        continue;
      }
      if (c === q) break;
      out += c;
    }
    return { k: "str", v: out, s, e: this.i, quote: q };
  };
  Parser.prototype.obj = function() {
    var s = this.i;
    this.i++;
    var props = [];
    this.ws();
    if (this.s[this.i] === "}") {
      this.i++;
      return { k: "obj", props, s, e: this.i };
    }
    for (; ; ) {
      this.ws();
      var ks = this.i;
      var keyNode = this.s[this.i] === '"' || this.s[this.i] === "'" ? this.str() : function(p) {
        var m = /^[A-Za-z_$][\w$]*/.exec(p.s.slice(p.i));
        if (!m) p.err("bad key");
        p.i += m[0].length;
        return { v: m[0] };
      }(this);
      var key = keyNode.v;
      this.ws();
      if (this.s[this.i] !== ":") this.err("expected :");
      this.i++;
      var val = this.value();
      props.push({ key, val, s: ks, e: this.i, vs: val.s, ve: val.e });
      this.ws();
      if (this.s[this.i] === ",") {
        this.i++;
        this.ws();
        if (this.s[this.i] === "}") {
          this.i++;
          break;
        }
        continue;
      }
      if (this.s[this.i] === "}") {
        this.i++;
        break;
      }
      this.err("expected , or }");
    }
    return { k: "obj", props, s, e: this.i };
  };
  Parser.prototype.arr = function() {
    var s = this.i;
    this.i++;
    var items = [];
    this.ws();
    if (this.s[this.i] === "]") {
      this.i++;
      return { k: "arr", items, s, e: this.i };
    }
    for (; ; ) {
      items.push(this.value());
      this.ws();
      if (this.s[this.i] === ",") {
        this.i++;
        this.ws();
        if (this.s[this.i] === "]") {
          this.i++;
          break;
        }
        continue;
      }
      if (this.s[this.i] === "]") {
        this.i++;
        break;
      }
      this.err("expected , or ]");
    }
    return { k: "arr", items, s, e: this.i };
  };
  function prop(o, k) {
    if (!o || o.k !== "obj") return null;
    for (var i = 0; i < o.props.length; i++) if (o.props[i].key === k) return o.props[i];
    return null;
  }
  function numOf(o, k, d) {
    var p = prop(o, k);
    return p && p.val.k === "num" ? p.val.v : d;
  }
  function strOf(o, k, d) {
    var p = prop(o, k);
    return p && p.val.k === "str" ? p.val.v : d;
  }
  function dataOf(o) {
    var p = prop(o, "data");
    if (!p) return null;
    if (p.val.k === "str") return { form: "str", list: p.val.v.split(/\s+/).filter(function(x) {
      return x.length;
    }), range: [p.val.s, p.val.e] };
    if (p.val.k === "arr") return { form: "arr", list: p.val.items.map(function(x) {
      return String(x.v);
    }), range: [p.val.s, p.val.e] };
    return null;
  }
  function parseWave(w, dataList) {
    var slots = [], subs = [], di = 0, prev = "x", pending = "";
    for (var i = 0; i < w.length; i++) {
      var c = w[i];
      if (c === "<" || c === ">") {
        pending += c;
        continue;
      }
      if (pending) {
        subs.push({ at: slots.length, s: pending });
        pending = "";
      }
      var rep = c === "." || c === "|";
      var point = !rep;
      var wv = point ? rep ? "x" : c : prev;
      var label = null;
      if (point && !rep && BUS.test(c)) label = dataList && di < dataList.length ? dataList[di++] : "";
      slots.push({ w: wv, point, gap: c === "|", label });
      prev = wv;
    }
    if (pending) subs.push({ at: slots.length, s: pending });
    return { slots, subs, consumed: di };
  }
  function normalizeSlots(l) {
    var prev = "x";
    for (var i = 0; i < l.slots.length; i++) {
      var s = l.slots[i];
      if (s.point && !s.gap) {
        prev = s.w;
      } else {
        s.w = prev;
        s.label = null;
      }
    }
  }
  var LANE_KEYS = { name: 1, wave: 1, data: 1, node: 1, phase: 1, period: 1 };
  function makeLane(item, groupPath, id, src) {
    var w = strOf(item, "wave", ""), d = dataOf(item), nd = strOf(item, "node", null);
    var waveNode = prop(item, "wave");
    var waveRaw = waveNode && waveNode.val.k !== "str" ? src.slice(waveNode.val.s, waveNode.val.e) : null;
    var extras = [];
    item.props.forEach(function(p) {
      if (!LANE_KEYS[p.key]) extras.push({ key: p.key, text: src.slice(p.s, p.e) });
    });
    var pw = parseWave(w, d ? d.list : []);
    var slots = pw.slots, n = slots.length;
    var node = [];
    var nn = n > 0 ? n : nd ? nd.length : 0;
    for (var i = 0; i < nn; i++) node.push(nd && i < nd.length ? nd[i] : ".");
    var lane = {
      id,
      kind: "signal",
      name: strOf(item, "name", "sig"),
      phase: numOf(item, "phase", 0),
      period: numOf(item, "period", 1),
      groupPath: groupPath.slice(),
      slots,
      subs: pw.subs,
      node,
      dataForm: d ? d.form : null,
      range: [item.s, item.e],
      extras,
      waveRaw,
      orig: { wave: w, name: strOf(item, "name", "sig"), data: d ? d.list.slice() : null, node: nd, phase: numOf(item, "phase", 0), period: numOf(item, "period", 1) }
    };
    ["wave", "name", "data", "node", "phase", "period"].forEach(function(k) {
      var p = prop(item, k);
      lane[k + "Range"] = p ? [p.val.s, p.val.e] : null;
      lane[k + "PropRange"] = p ? [p.s, p.e] : null;
    });
    normalizeSlots(lane);
    return lane;
  }
  function collect(items, groupPath, out, src) {
    items.forEach(function(item) {
      if (item.k === "obj") {
        if (!prop(item, "name") && !prop(item, "wave") && !prop(item, "node") && !prop(item, "data")) {
          out.push({
            id: "l" + out.length,
            kind: "spacer",
            name: "",
            groupPath: groupPath.slice(),
            slots: [],
            subs: [],
            node: [],
            range: [item.s, item.e],
            raw: src.slice(item.s, item.e),
            orig: {}
          });
          return;
        }
        out.push(makeLane(item, groupPath, "l" + out.length, src));
      } else if (item.k === "arr") {
        var h = item.items[0];
        var g = h && (h.k === "str" || h.k === "num") ? String(h.v) : "";
        collect(item.items.slice(1), groupPath.concat([g]), out, src);
      }
    });
  }
  function buildIR(src) {
    var p = new Parser(src);
    p.ws();
    var wrapped = false;
    if (p.s[p.i] === "(") {
      p.i++;
      wrapped = true;
    }
    var root = p.value();
    if (root.k !== "obj") throw new Error("root must be an object");
    p.ws();
    if (wrapped) {
      if (p.s[p.i] !== ")") throw new Error("missing closing parenthesis");
      p.i++;
      p.ws();
    }
    if (p.i < p.s.length) throw new Error("unexpected content after the root object @" + p.i);
    var sig = prop(root, "signal");
    if (!sig) {
      if (prop(root, "reg")) throw new Error("this is a register diagram (reg), TimingBench edits timing diagrams (signal)");
      throw new Error("missing signal array");
    }
    if (sig.val.k !== "arr") throw new Error("signal must be an array");
    var lanes = [];
    collect(sig.val.items, [], lanes, src);
    var N = 0;
    lanes.forEach(function(l) {
      if (l.kind === "signal") {
        N = Math.max(N, l.slots.length);
        normalizeSlots(l);
      }
    });
    var edges = [], extras = [], config = null;
    root.props.forEach(function(pr) {
      if (pr.key === "signal") return;
      if (pr.key === "edge" && pr.val.k === "arr") {
        edges = pr.val.items.map(function(x) {
          return String(x.v);
        });
        return;
      }
      if (pr.key === "config" && pr.val.k === "obj") config = materialize(pr.val);
      extras.push({ key: pr.key, text: src.slice(pr.s, pr.e), range: [pr.s, pr.e] });
    });
    return { ticks: N, lanes, edges, extras, config, raw: src, rootRange: [root.s, root.e], rev: 0 };
  }
  function quote(s, q) {
    q = q || "'";
    return q + String(s).replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), "\\" + q).replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\x08/g, "\\b").replace(/\x0c/g, "\\f").replace(/\x0b/g, "\\v").replace(/\x00/g, "\\0") + q;
  }
  function qmap(a) {
    return a.map(function(x) {
      return quote(x);
    }).join(", ");
  }
  function subsAt(l, at) {
    var s = "";
    l.subs.forEach(function(x) {
      if (x.at === at) s += x.s;
    });
    return s;
  }
  function laneWave(l) {
    var out = "";
    for (var i = 0; i < l.slots.length; i++) {
      out += subsAt(l, i);
      var s = l.slots[i];
      if (s.gap) out += "|";
      else if (!s.point) out += ".";
      else out += s.w;
    }
    return out + subsAt(l, l.slots.length);
  }
  function laneLabels(l) {
    return l.slots.filter(function(s) {
      return s.point && !s.gap && BUS.test(s.w) && s.label !== null;
    }).map(function(s) {
      return s.label;
    });
  }
  function needData(l) {
    var a = laneLabels(l);
    return a.length > 0 && (l.dataForm !== null || a.some(function(x) {
      return x !== "";
    }));
  }
  function spacerSrc(l) {
    return l.raw || "{}";
  }
  function emitLane(l) {
    if (l.kind === "spacer") return spacerSrc(l);
    var labels = laneLabels(l), parts = [];
    parts.push("name: " + quote(l.name));
    parts.push("wave: " + (l.waveRaw || quote(laneWave(l))));
    if (needData(l)) parts.push("data: " + (l.dataForm === "str" && labels.every(function(x) {
      return x && !/\s/.test(x);
    }) ? quote(labels.join(" ")) : "[" + qmap(labels) + "]"));
    if (l.node.some(function(x) {
      return x !== ".";
    })) parts.push("node: " + quote(l.node.join("")));
    if (l.phase) parts.push("phase: " + l.phase);
    if (l.period !== 1) parts.push("period: " + l.period);
    (l.extras || []).forEach(function(x) {
      parts.push(x.text);
    });
    return "{ " + parts.join(", ") + " }";
  }
  function emitGroup(items, depth) {
    var out = [], i = 0;
    while (i < items.length) {
      var l = items[i];
      if (l.kind === "spacer") {
        out.push(spacerSrc(l));
        i++;
        continue;
      }
      if (l.groupPath.length > depth) {
        var g = l.groupPath[depth], sub = [];
        while (i < items.length && items[i].groupPath.length > depth && items[i].groupPath[depth] === g) {
          sub.push(items[i]);
          i++;
        }
        out.push("[" + quote(g) + ", " + emitGroup(sub, depth + 1).join(", ") + "]");
      } else {
        out.push(emitLane(l));
        i++;
      }
    }
    return out;
  }
  function emitIR(ir) {
    var body = emitGroup(ir.lanes, 0).map(function(s) {
      return "  " + s;
    }).join(",\n");
    var tail = "";
    if (ir.edges.length) tail += ",\n  edge: [" + qmap(ir.edges) + "]";
    ir.extras.forEach(function(x) {
      tail += ",\n  " + x.text;
    });
    return "{ signal: [\n" + body + "\n]" + tail + "\n}";
  }
  function enc(s) {
    s = String(s);
    return s.length + ":" + s + ";";
  }
  function canon(ir) {
    var parts = [];
    ir.lanes.forEach(function(l) {
      if (l.kind === "spacer") {
        parts.push(enc("~" + enc(l.groupPath.join("/")) + enc(spacerSrc(l))));
        return;
      }
      var ss = l.slots.map(function(s) {
        return enc(s.w) + enc(s.point ? "P" : "r") + enc(s.gap ? "G" : "-") + enc(s.label === null ? "" : s.label);
      }).join("");
      parts.push(enc(enc(l.name) + enc(String(l.phase)) + enc(String(l.period)) + enc(l.groupPath.join("/")) + enc(l.node.join("")) + enc(l.waveRaw || laneWave(l)) + enc(ss) + enc((l.extras || []).map(function(x) {
        return x.text;
      }).join(""))));
    });
    parts.push(enc("E" + ir.edges.map(enc).join("")));
    return parts.join("");
  }
  function clone(ir) {
    return {
      ticks: ir.ticks,
      rev: ir.rev,
      raw: ir.raw,
      rootRange: ir.rootRange.slice(),
      config: ir.config ? JSON.parse(JSON.stringify(ir.config)) : null,
      edges: ir.edges.slice(),
      extras: ir.extras.map(function(x) {
        return { key: x.key, text: x.text, range: x.range.slice() };
      }),
      lanes: ir.lanes.map(function(l) {
        return {
          id: l.id,
          kind: l.kind,
          name: l.name,
          phase: l.phase,
          period: l.period,
          groupPath: l.groupPath.slice(),
          slots: l.slots.map(function(s) {
            var o = { w: s.w, point: s.point, gap: s.gap, label: s.label };
            if (s.saved) o.saved = { w: s.saved.w, label: s.saved.label };
            return o;
          }),
          subs: l.subs.map(function(s) {
            return { at: s.at, s: s.s };
          }),
          node: l.node.slice(),
          dataForm: l.dataForm,
          range: l.range.slice(),
          raw: l.raw,
          extras: (l.extras || []).map(function(x) {
            return { key: x.key, text: x.text };
          }),
          waveRaw: l.waveRaw || null,
          waveRange: l.waveRange ? l.waveRange.slice() : null,
          nameRange: l.nameRange ? l.nameRange.slice() : null,
          dataRange: l.dataRange ? l.dataRange.slice() : null,
          nodeRange: l.nodeRange ? l.nodeRange.slice() : null,
          phaseRange: l.phaseRange ? l.phaseRange.slice() : null,
          periodRange: l.periodRange ? l.periodRange.slice() : null,
          wavePropRange: l.wavePropRange ? l.wavePropRange.slice() : null,
          namePropRange: l.namePropRange ? l.namePropRange.slice() : null,
          dataPropRange: l.dataPropRange ? l.dataPropRange.slice() : null,
          nodePropRange: l.nodePropRange ? l.nodePropRange.slice() : null,
          phasePropRange: l.phasePropRange ? l.phasePropRange.slice() : null,
          periodPropRange: l.periodPropRange ? l.periodPropRange.slice() : null,
          orig: { wave: l.orig.wave, name: l.orig.name, data: l.orig.data ? l.orig.data.slice() : null, node: l.orig.node, phase: l.orig.phase, period: l.orig.period }
        };
      })
    };
  }
  function labelList(v) {
    if (Array.isArray(v)) return v.map(function(x) {
      return String(x);
    });
    var s = String(v === void 0 || v === null ? "" : v).trim();
    return s ? s.split(/\s+/) : [];
  }
  function retick(n) {
    var t = 0;
    n.lanes.forEach(function(l) {
      if (l.kind === "signal") t = Math.max(t, l.slots.length);
    });
    n.ticks = t;
  }
  function nextLaneId(n) {
    var used = {}, i = 0;
    n.lanes.forEach(function(l) {
      used[l.id] = 1;
    });
    while (used["l" + i]) i++;
    return "l" + i;
  }
  function ensureTail(l, tick) {
    if (l.kind !== "signal" || l.slots.length > tick) return false;
    var last = l.slots.length ? l.slots[l.slots.length - 1].w : "x";
    while (l.slots.length <= tick) {
      l.slots.push({ w: last, point: false, gap: false, label: null });
      l.node.push(".");
    }
    return true;
  }
  function unraw(l) {
    if (l && l.waveRaw) l.waveRaw = null;
  }
  function applyOp(ir, op) {
    var n = clone(ir), changed = true;
    switch (op.t) {
      case "setSlot": {
        var ext = false;
        n.lanes.forEach(function(l) {
          if (l.kind !== "signal" || op.lanes && op.lanes.indexOf(l.id) < 0) return;
          unraw(l);
          if (ensureTail(l, op.tick)) ext = true;
          var v = op.v;
          if (v === "auto") {
            var cur = l.slots[op.tick].w;
            v = ALL[(ALL.indexOf(cur) + 1 + ALL.length) % ALL.length] || "1";
          }
          l.slots[op.tick] = { w: v, point: true, gap: false, label: BUS.test(v) ? "" : null };
          normalizeSlots(l);
        });
        if (ext) retick(n);
        break;
      }
      case "setLabel":
        n.lanes.forEach(function(l) {
          if (l.id === op.lane && op.tick < l.slots.length) {
            var s = l.slots[op.tick];
            if (s.point && !s.gap && BUS.test(s.w)) s.label = op.v;
          }
        });
        break;
      case "setNode":
        n.lanes.forEach(function(l) {
          if (l.id === op.lane && op.tick < l.slots.length) l.node[op.tick] = op.v || ".";
        });
        break;
      case "rename":
        n.lanes.forEach(function(l) {
          if (l.id === op.lane) l.name = String(op.v);
        });
        break;
      case "setWave":
        n.lanes.forEach(function(l) {
          if (l.id !== op.lane || l.kind !== "signal") return;
          unraw(l);
          var pw = parseWave(String(op.v || ""), laneLabels(l)), oldNode = l.node.slice();
          l.slots = pw.slots;
          l.subs = pw.subs;
          l.node = [];
          for (var wi = 0; wi < l.slots.length; wi++) l.node.push(wi < oldNode.length ? oldNode[wi] : ".");
          normalizeSlots(l);
        });
        retick(n);
        break;
      case "setLabels":
        n.lanes.forEach(function(l) {
          if (l.id !== op.lane || l.kind !== "signal") return;
          var list = labelList(op.v), k = 0;
          if (!list.length) l.dataForm = null;
          l.slots.forEach(function(s) {
            if (s.point && !s.gap && BUS.test(s.w)) s.label = k < list.length ? list[k++] : "";
            else s.label = null;
          });
        });
        break;
      case "setNodeStr":
        n.lanes.forEach(function(l) {
          if (l.id !== op.lane || l.kind !== "signal") return;
          var s = String(op.v || ""), out = [];
          for (var ni = 0; ni < l.slots.length; ni++) out.push(ni < s.length ? s[ni] : ".");
          l.node = out;
        });
        break;
      case "moveLane": {
        var mi = -1;
        n.lanes.forEach(function(l, i) {
          if (l.id === op.lane) mi = i;
        });
        if (mi < 0) break;
        var mj = op.to !== void 0 && op.to !== null ? Math.max(0, Math.min(n.lanes.length - 1, op.to)) : mi + (op.v === "up" ? -1 : 1);
        if (mj >= 0 && mj < n.lanes.length && mj !== mi) {
          var mmoved = n.lanes.splice(mi, 1)[0];
          n.lanes.splice(mj, 0, mmoved);
          rehomeAfterMove(n.lanes, op.lane);
        }
        break;
      }
      // 整列移动：每一行的第 from 个槽位移到 to。槽位带着字符 / 数据标签 / 断点标志一起走，
      // node 锚点串与 sub-cycle 包的下标同步重映射；continuation 槽的 `w` 由 normalizeSlots 重算。
      case "moveTick": {
        var mf = op.from, mt = op.to;
        if (mf === mt || mf < 0) break;
        n.lanes.forEach(function(l) {
          if (l.kind !== "signal") return;
          unraw(l);
          if (mf >= l.slots.length) return;
          var mslot = l.slots.splice(mf, 1)[0];
          var mnode = l.node.splice(mf, 1)[0];
          var mat = Math.max(0, Math.min(mt, l.slots.length));
          l.slots.splice(mat, 0, mslot);
          l.node.splice(mat, 0, mnode === void 0 ? "." : mnode);
          l.subs.forEach(function(s) {
            if (s.at === mf) s.at = mat;
            else if (mf < mat && s.at > mf && s.at <= mat) s.at--;
            else if (mf > mat && s.at >= mat && s.at < mf) s.at++;
          });
          normalizeSlots(l);
        });
        break;
      }
      case "setPhase":
      case "setPeriod":
        n.lanes.forEach(function(l) {
          if (l.id === op.lane) l[op.t === "setPhase" ? "phase" : "period"] = op.v;
        });
        break;
      case "setEdges":
        n.edges = op.v.slice();
        break;
      case "toggleGap":
        n.lanes.forEach(function(l) {
          if (l.kind !== "signal" || op.tick >= l.slots.length) return;
          var s = l.slots[op.tick];
          if (s.gap) {
            if (s.saved) {
              s.point = true;
              s.gap = false;
              s.w = s.saved.w;
              s.label = s.saved.label;
              delete s.saved;
            } else s.gap = false;
          } else {
            if (s.point) s.saved = { w: s.w, label: s.label };
            s.gap = true;
            s.point = false;
            s.label = null;
          }
          normalizeSlots(l);
        });
        break;
      case "insertTick":
        n.lanes.forEach(function(l) {
          if (l.kind !== "signal") return;
          unraw(l);
          var at = Math.min(op.tick, l.slots.length), prev = at > 0 ? l.slots[at - 1].w : "x";
          l.slots.splice(at, 0, { w: prev, point: false, gap: false, label: null });
          l.node.splice(at, 0, ".");
          l.subs.forEach(function(s) {
            if (s.at >= at) s.at++;
          });
          normalizeSlots(l);
        });
        n.ticks++;
        break;
      case "deleteTick":
        if (n.ticks <= 1) {
          changed = false;
          break;
        }
        n.lanes.forEach(function(l) {
          if (l.kind !== "signal" || op.tick >= l.slots.length) return;
          unraw(l);
          l.slots.splice(op.tick, 1);
          l.node.splice(op.tick, 1);
          l.subs.forEach(function(s) {
            if (s.at > op.tick) s.at--;
          });
          normalizeSlots(l);
        });
        n.ticks--;
        break;
      case "addLane": {
        var aid = op.id || nextLaneId(n);
        var aat = op.at === void 0 ? n.lanes.length : Math.max(0, Math.min(n.lanes.length, op.at));
        var fresh;
        if (op.kind === "spacer") {
          fresh = {
            id: aid,
            kind: "spacer",
            name: "",
            phase: 0,
            period: 1,
            groupPath: [],
            slots: [],
            subs: [],
            node: [],
            dataForm: null,
            range: [0, 0],
            raw: "",
            extras: [],
            waveRaw: null,
            orig: {},
            fresh: true
          };
        } else {
          fresh = {
            id: aid,
            kind: "signal",
            name: op.name || "new",
            phase: 0,
            period: 1,
            groupPath: [],
            slots: [],
            subs: [],
            node: [],
            dataForm: null,
            range: [0, 0],
            extras: [],
            waveRaw: null,
            waveRange: null,
            nameRange: null,
            dataRange: null,
            nodeRange: null,
            phaseRange: null,
            periodRange: null,
            wavePropRange: null,
            namePropRange: null,
            dataPropRange: null,
            nodePropRange: null,
            phasePropRange: null,
            periodPropRange: null,
            orig: { wave: "", name: op.name || "new", data: null, node: null, phase: 0, period: 1 },
            fresh: true
          };
          for (var ai = 0; ai < n.ticks; ai++) {
            fresh.slots.push({ w: "x", point: ai === 0, gap: false, label: null });
            fresh.node.push(".");
          }
          normalizeSlots(fresh);
        }
        n.lanes.splice(aat, 0, fresh);
        break;
      }
      case "deleteLane":
        n.lanes = n.lanes.filter(function(l) {
          return l.id !== op.lane;
        });
        break;
      // 分组改名 / 重分组。两种定址方式，语义都是「把这些行的 groupPath 设成 path」：
      //   · 传 lanes（行 id 数组）—— 行上下文条的「组」动作 / 范围归组用这条；
      //   · 传 old（旧路径字符串）—— 点组名改整组用这条，含 spacer，整组一起改。
      // 空路径 = 取消分组。分组结构变化无法用字面量补丁表达，patchSource 会回落全量 emit。
      case "regroup": {
        var oldKey = String(op.old || "");
        var ids = op.lanes || null;
        var depth = oldKey ? oldKey.split("/").length : 0;
        n.lanes.forEach(function(l) {
          if (ids) {
            if (ids.indexOf(l.id) >= 0) l.groupPath = (op.path || []).slice();
            return;
          }
          var k = l.groupPath.join("/");
          if (k === oldKey || oldKey && k.indexOf(oldKey + "/") === 0) {
            l.groupPath = (op.path || []).concat(l.groupPath.slice(depth));
          }
        });
        break;
      }
      default:
        changed = false;
    }
    if (changed) {
      n.rev++;
    }
    return n;
  }
  function rehomeAfterMove(lanes, id) {
    var i = -1;
    for (var k = 0; k < lanes.length; k++) {
      if (lanes[k].id === id) {
        i = k;
        break;
      }
    }
    if (i < 0) return;
    var self = lanes[i], path = self.groupPath;
    var above = i > 0 ? lanes[i - 1] : null, below = i + 1 < lanes.length ? lanes[i + 1] : null;
    function key(l) {
      return l ? l.groupPath.join("/") : null;
    }
    if (path.length && (key(above) === key(self) || key(below) === key(self))) return;
    if (above && below && above.groupPath.length && key(above) === key(below) && above.kind === self.kind) {
      self.groupPath = above.groupPath.slice();
      return;
    }
    for (var d = path.length - 1; d >= 1; d--) {
      var pref = path.slice(0, d).join("/");
      var up = above && above.groupPath.slice(0, d).join("/") === pref;
      var dn = below && below.groupPath.slice(0, d).join("/") === pref;
      if (up || dn) {
        self.groupPath = path.slice(0, d);
        return;
      }
    }
    self.groupPath = [];
  }
  function slotsEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      var x = a[i], y = b[i];
      if (x.w !== y.w || x.point !== y.point || x.gap !== y.gap || x.label !== y.label) return false;
    }
    return true;
  }
  function subsSig(l) {
    return l.subs.map(function(s) {
      return s.at + ":" + s.s;
    }).join(",");
  }
  function fieldInsert(range, src, texts) {
    var i = range[1] - 1, body = texts.join(", ");
    while (i > range[0] && /\s/.test(src[i - 1])) i--;
    if (i > range[0] && src[i - 1] === ",") return { s: i - 1, e: i, txt: ", " + body + "," };
    return { s: i, e: i, txt: ", " + body + " " };
  }
  function fieldDelete(propRange, src) {
    var st = propRange[0], en = propRange[1], j = st;
    while (j > 0 && /\s/.test(src[j - 1])) j--;
    if (src[j - 1] === ",") st = j - 1;
    else {
      var k = en;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === ",") en = k + 1;
    }
    return { s: st, e: en, txt: "" };
  }
  function patchSource(ir, newIR) {
    var src = ir.raw, edits = [], fallback = false;
    if (ir.lanes.map(function(l) {
      return l.id;
    }).join("|") !== newIR.lanes.map(function(l) {
      return l.id;
    }).join("|")) fallback = true;
    if (ir.lanes.length === newIR.lanes.length) ir.lanes.forEach(function(ol, i) {
      if (newIR.lanes[i] && ol.groupPath.join("/") !== newIR.lanes[i].groupPath.join("/")) fallback = true;
    });
    newIR.lanes.forEach(function(nl) {
      var ol = null;
      ir.lanes.forEach(function(l) {
        if (l.id === nl.id) ol = l;
      });
      if (!ol) {
        fallback = true;
        return;
      }
      if (nl.fresh) {
        fallback = true;
        return;
      }
      if (nl.kind === "spacer" || ol.kind === "spacer") return;
      var waveChanged = !slotsEqual(ol.slots, nl.slots) || subsSig(ol) !== subsSig(nl);
      if (waveChanged) {
        if (!nl.waveRange) {
          fallback = true;
          return;
        }
        edits.push({ s: nl.waveRange[0], e: nl.waveRange[1], txt: quote(laneWave(nl), src[nl.waveRange[0]]) });
      }
      if (nl.name !== ol.orig.name) {
        if (!nl.nameRange) {
          fallback = true;
          return;
        }
        edits.push({ s: nl.nameRange[0], e: nl.nameRange[1], txt: quote(nl.name, src[nl.nameRange[0]]) });
      }
      var adds = [];
      var oldLabels = ol.orig.data || [], newLabels = laneLabels(nl), effective = oldLabels.slice(0, laneLabels(ol).length);
      var need = needData(nl), oldNeed = ol.dataRange !== null && effective.length > 0;
      var dataChanged = (need || oldNeed) && (effective.join("") !== newLabels.join("") || need !== oldNeed);
      if (dataChanged) {
        var q0 = nl.dataRange ? src[nl.dataRange[0]] : nl.waveRange ? src[nl.waveRange[0]] : "'";
        var txt = nl.dataForm === "str" && newLabels.length && newLabels.every(function(x) {
          return x && !/\s/.test(x);
        }) ? quote(newLabels.join(" "), q0) : "[" + qmap(newLabels) + "]";
        if (!need) {
          if (nl.dataPropRange) edits.push(fieldDelete(nl.dataPropRange, src));
          else if (nl.dataRange) fallback = true;
        } else if (nl.dataRange) edits.push({ s: nl.dataRange[0], e: nl.dataRange[1], txt });
        else adds.push("data: " + txt);
      }
      var nodeStr = nl.node.join(""), oldNode = ol.orig.node || "";
      if (nodeStr.replace(/\.+$/, "") !== oldNode.replace(/\.+$/, "")) {
        if (nl.nodeRange) edits.push({ s: nl.nodeRange[0], e: nl.nodeRange[1], txt: quote(nodeStr, src[nl.nodeRange[0]]) });
        else adds.push("node: " + quote(nodeStr));
      }
      [["phase", "phaseRange"], ["period", "periodRange"]].forEach(function(pair) {
        var k = pair[0], r = pair[1], def = k === "phase" ? 0 : 1;
        if (nl[k] === ol.orig[k]) return;
        if (nl[r]) edits.push({ s: nl[r][0], e: nl[r][1], txt: String(nl[k]) });
        else if (nl[k] !== def) adds.push(k + ": " + nl[k]);
      });
      if (adds.length) {
        if (!nl.range || nl.range[1] <= nl.range[0]) fallback = true;
        else edits.push(fieldInsert(nl.range, src, adds));
      }
    });
    if (ir.edges.map(enc).join("") !== newIR.edges.map(enc).join("")) fallback = true;
    if (fallback) return { src: emitIR(newIR), patched: false, ratio: 0, edits: 0 };
    var mark = {}, ok = true;
    edits.forEach(function(e) {
      for (var i = e.s; i < e.e; i++) {
        if (mark[i]) ok = false;
        mark[i] = 1;
      }
    });
    if (!ok) return { src: emitIR(newIR), patched: false, ratio: 0, edits: 0 };
    edits.sort(function(a, b) {
      return b.s - a.s;
    });
    var out = src, replaced = 0;
    edits.forEach(function(e) {
      out = out.slice(0, e.s) + e.txt + out.slice(e.e);
      replaced += e.e - e.s;
    });
    var untouched = src.length - replaced;
    return { src: out, patched: true, ratio: out.length ? Math.max(0, Math.min(1, untouched / out.length)) : 1, edits: edits.length };
  }
  function materialize(n) {
    if (n.k === "obj") {
      var o = {};
      n.props.forEach(function(p) {
        o[p.key] = materialize(p.val);
      });
      return o;
    }
    if (n.k === "arr") return n.items.map(materialize);
    return n.v;
  }
  function parseObject(src) {
    var p = new Parser(src);
    p.ws();
    if (p.s[p.i] === "(") p.i++;
    return materialize(p.value());
  }
  function formatSource(src) {
    src = String(src == null ? "" : src);
    var body = src.replace(/^\s+|\s+$/g, "");
    if (body.indexOf("\n") >= 0 || body.indexOf("\r") >= 0 || body.indexOf("//") >= 0 || body.indexOf("/*") >= 0) return src;
    var ir;
    try {
      ir = buildIR(src);
    } catch (e) {
      return src;
    }
    try {
      var out = emitIR(ir);
      return canon(buildIR(out)) === canon(ir) ? out : src;
    } catch (e) {
      return src;
    }
  }
  return {
    buildIR,
    emitIR,
    canon,
    applyOp,
    patchSource,
    clone,
    laneWave,
    laneLabels,
    quote,
    enc,
    parseObject,
    normalizeSlots,
    formatSource,
    BUS,
    LEVEL,
    CLOCK,
    ALL
  };
}();

// ../TimingBench/src/core/example.js
var EXAMPLE = "{ signal: [\n  // clock: one period per |\n  { name: 'clk',  wave: 'p.....|...' },\n  { name: 'dat',  wave: 'x.345x|=.x', data: ['head', 'body', 'tail', 'data'] },\n  { name: 'req',  wave: '0.1..0|1.0', node: '..a...' },\n  {},\n  { name: 'ack',  wave: '1.....|01.' },\n  ['Master',\n    { name: 'wr', wave: '01.0....', node: '.b......' }\n  ]\n],\n edge: ['a~>b t1'],\n config: { hscale: 1 }\n}\n";

// ../TimingBench/src/editor/mode.js
function detect() {
  try {
    if (typeof window === "undefined") return false;
    var forced = window.location ? new URLSearchParams(window.location.search).get("touch") : null;
    if (forced === "1") return true;
    if (forced === "0") return false;
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
  } catch (e) {
  }
  return false;
}
var TOUCH = detect();

// ../TimingBench/src/editor/geometry.js
var G = {
  CELL: TOUCH ? 48 : 38,
  // 行名区宽度与波形起点在运行时**按内容自适应**（shapes.js 每次 redraw 重算并写回
  // G.NAME_W / G.XS），这里的值只是首帧兜底。算法：
  //   NAME_W = 8·⌈clamp(64, 上限, leftBound + 最宽行名 + 16) / 8⌉，leftBound = PAD +（桌面编辑态 ? 18 : 0）
  //   XS     = NAME_W + 8
  // 量化到 8px 且只向上取整：改名不再逐像素推动波形，又不至于把行名压出画布。
  // 只读态与触摸端不画拖拽把手，左界就只剩 PAD —— 名字短时行名区自然更窄。
  NAME_W: TOUCH ? 96 : 104,
  ROW_H: TOUCH ? 60 : 48,
  // 表头高度。0.25.0 起表头不再画列号（对齐 WaveDrom：它的图只有行名 + 波形），
  // 只剩「追加列」的虚线框与选中后才出现的列把手 —— 原来为数字留的高度就多余了。
  // 桌面 28 = COL_Y(6) + 虚线框 20 + 2；触摸 44→40 = COL_Y(8) + 框 28 + 4。
  TOP: TOUCH ? 40 : 28,
  PAD: 16,
  // 画布右侧的控件预留宽（`W = ACT_X + ACT_W + PAD`）。桌面原来留 196px 给行末那排
  // 「~ = ◇ + ∅ ✕」行工具与列头按钮 —— 两者 0.15.1 已连渲染函数一起删除，那块区域什么都不画，
  // 留着只会让画布比内容宽出一截、在小视口里变成一段能横向滚过去的空白。现在收到 0：
  // 画布宽度贴合内容右缘（= 只读态 roW 的口径），宽屏下仍由 viewW 撑满容器。
  ACT_W: TOUCH ? 24 : 0,
  COL_Y: TOUCH ? 8 : 6,
  // 字符缩略图的**图标画布**固定为 28×26，不随指针类型变 —— 命中区（按钮盒子）才按
  // 指针放大到 48×44。两者拆开，是为了同一个字符在手机与桌面画出**一模一样的形状**，
  // 只是整体放大；若连画布也换成 44×44 并另配一套 y 坐标（旧写法），同一字符在两端
  // 的高宽比就不同（0.57 vs 0.68），看起来像两个设计。
  CHIP_W: 28,
  CHIP_H: 26,
  // 波形起点：首帧兜底值 = 上面的 NAME_W + 8，同样在 redraw 里按内容重算。
  XS: TOUCH ? 104 : 112
};
function lanePeriod(l) {
  var p = Number(l && l.period);
  return isFinite(p) && p >= 1 ? Math.round(p) : 1;
}
function laneShift(l) {
  var p = Number(l && l.phase);
  return isFinite(p) ? p : 0;
}
var PHASE_STEP = 0.05;
var PHASE_MAX = 4;
var PHASE_MIN = -PHASE_MAX;
var HSCALE_MAX = 8;
function hscaleOf(ir) {
  var n = ir && ir.config ? Number(ir.config.hscale) : 1;
  if (!isFinite(n) || n <= 0) return 1;
  return Math.max(1, Math.min(HSCALE_MAX, Math.round(n)));
}
function laneChars(l, ticks) {
  var p = lanePeriod(l), own = l.slots ? l.slots.length : 0;
  return Math.max(own, Math.ceil(ticks / p));
}
function cellGeo(l, tick) {
  var p = lanePeriod(l), sh = laneShift(l), w = p * G.CELL;
  var x0 = G.XS + (tick * p - sh) * G.CELL;
  return { x0, w, cx: x0 + w / 2 };
}
var ZOOM_MAX = 4;
var ZOOM_MIN = 0.2;
function clampZoom(z, min) {
  z = Number(z);
  if (!isFinite(z) || z <= 0) return min === void 0 ? 1 : min;
  var lo = min === void 0 || !isFinite(min) ? 1 : Math.min(1, Math.max(ZOOM_MIN, min));
  return z < lo ? lo : z > ZOOM_MAX ? ZOOM_MAX : z;
}

// ../TimingBench/src/core/util.js
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function cut(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "\u2026" : s;
}

// ../TimingBench/src/editor/cap.js
var ON = "on";
var OFF = "off";
var SW = "swap";
function sceneOf(state) {
  return (TOUCH ? "touch" : "desk") + (state && state.readonly ? "View" : "Edit");
}
var CAP = {
  // 画布 HUD：撤销 / 重做 / 分屏方向 / 生成嵌入代码（卡片里去掉）。
  // 连线按钮在 0.9.17 从 HUD 移到底部上下文条（与 label / node 同排），见 ACTS。
  hud: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF },
  colhead: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF },
  // 列操作 / 行工具在画布上**没有渲染实现**了（0.15.1 删净：`colBtn` / `rowTools` 连同行内
  // 命中分支与 CSS 一起消失）。两者都收进下面同一个上下文条，选中行 / 列时出现。
  // 它们原来占的那条右侧带子（`ACT_W = 196px`）也随之在 0.15.2 收到 0 —— 画布宽度现在只
  // 贴合内容右缘，小视口下不再多出一段能横向滚过去的空白。
  // 这两项仍留在表里，是两个理由：① 记录「画布上不画、改由谁承担」这个去向，后来人不必
  // 从 git 历史里考古；② 让下面 `editEntries` 的「只读不泄漏编辑入口」检查继续覆盖它们 ——
  // 真有人把行工具加回去，只读卡片那条断言立刻会红。
  colAct: { deskEdit: SW, deskView: OFF, touchEdit: SW, touchView: OFF },
  rowTool: { deskEdit: SW, deskView: OFF, touchEdit: SW, touchView: OFF },
  // 行首拖拽把手（`rowDrag`）已在 0.9.13 删净 —— 图元、命中分支、拖拽结算一起走，
  // 行重排的唯一通道是上下文条的 ↑ / ↓（键盘 `Ctrl+↑↓` 等价）。
  // 数据标签的 ✎ 徽标（旧 `cellLabel`）已在 0.9.12 删净：13×11 命中区手指点不中、且靠
  // hover 显形，只有桌面能用 —— 于是「改单格标签」曾是桌面独有。现在四场景共用上下文条
  // （`ACTS.cell`），`B` 快捷键属于叠加的快捷方式、不进这张表。
  laneMeta: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF },
  spacerMark: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF },
  // 字符输入只剩一套实现：HTML 停靠条（`#chardock`）。桌面原来在 SVG 里画一条 23 颗的
  // 字符条（旧 `actionBar`），触摸端是固定停靠条 —— 同一件事两套渲染、两套布局、两套点击。
  // 现在统一为前者，并按**实际可用宽度**折叠：宽屏（含宽屏触摸 / 宽嵌卡片）一次铺满全部
  // 字符，窄屏才把放不下的收进 `⋯`。这是**布局**差异（宽度决定折叠），不是能力差异。
  // 顺带删掉了 SVG 字符条那段「滚动时反向位移把 chips 钉回可视区」的历史包袱，以及
  // `charChips` 图元。
  dock: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF },
  // 上下文条：四场景同一套图标（触摸钉底部、桌面钉右侧），是行 / 列动作的唯一入口。
  tbpanel: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF },
  // 就地编辑：四场景同一语义 —— 「在格子上开一个小输入框改这一个值」，桌面双击、触摸双敲。
  // 触摸端额外支持长按 480ms，但那是**叠加**不是替代：桌面没有长按的对应物（鼠标按住
  // 不动没有意义），所以它不进这张表，也就不构成 swap。
  inlineEdit: { deskEdit: ON, deskView: OFF, touchEdit: ON, touchView: OFF }
};
var HUD_ITEMS = ["undo", "redo", "layout", "view"];
function hudCmds(scene) {
  if (!can("hud", scene)) return [];
  return HUD_ITEMS.slice();
}
function can(name, scene) {
  var v = CAP[name];
  return !!v && v[scene] === ON;
}
var ACTS = {
  // group / spanUp / spanDown 是「分组」这一组动作：group 按当前**行范围**归组（输入组名，
  // 可用 / 嵌套，清空 = 退出这一层）；spanUp / spanDown 把范围向外推一行 —— 触摸端没有
  // Shift，这是它唯一能表达「一段连续行」的方式（桌面另有 Shift+点行名 / Shift+↑↓）。
  row: [
    "name",
    "wave",
    "data",
    "nodeStr",
    "phase",
    "period",
    "up",
    "down",
    "add",
    "spacer",
    "del",
    "group",
    "spanUp",
    "spanDown",
    "link"
  ],
  col: ["insert", "delete", "gap", "append", "link"],
  // 格级：作用对象是「某一个格子」而不是整行 / 整列。行级的 data / nodeStr 改的是整行
  // 全部标签 / 整行锚点串；这两项才是「只改这一格」。
  // **0.18.0 从上下文条挪到字符停靠条左侧**：它们和字符一样「只在选中格子时才有意义」，
  // 放同一行既省掉一整行常驻，也让「点格子 → 改这一格」的工具聚在一处。
  // link 同时留在 row / col 组里 —— 选中整行 / 整列时也要能起手连线，而停靠条那时不显示。
  dock: ["label", "node", "link"]
};

// ../TimingBench/src/editor/waveform.js
var CHIP_W = G.CHIP_W;
var BUS_CLASS = { "=": "bus2", "2": "bus2", "3": "bus3", "4": "bus4", "5": "bus5", "6": "bus6", "7": "bus7", "8": "bus8", "9": "bus9" };
function waveLevel(ch, T2, M, B) {
  if (/[1hHu]/.test(ch)) return T2;
  if (/[0lLd]/.test(ch)) return B;
  if (Core.BUS.test(ch) || Core.CLOCK.test(ch) || ch === "x") return null;
  return M;
}
function waveHatch(X, x1, T2, B, W) {
  var o = [], dy = B - T2, step = Math.max(3, W / 7), k, sx, ex, a, b;
  for (k = -6; k <= 10; k++) {
    sx = X + k * step;
    ex = sx + dy;
    a = Math.max(X, sx);
    b = Math.min(x1, ex);
    if (b <= a) continue;
    o.push('<path class="waveHair" d="M' + a + "," + (B - (a - sx)) + " L" + b + "," + (B - (b - sx)) + '"/>');
  }
  return o.join("");
}
function waveArrow(ax, T2, B, up) {
  var y0 = up ? T2 + 3 : B - 3, y1 = up ? T2 + 11 : B - 11;
  return '<path class="waveArrow" d="M' + (ax - 3) + "," + y1 + " L" + ax + "," + y0 + " L" + (ax + 3) + "," + y1 + " Q" + ax + "," + (y1 - 2) + " " + (ax - 3) + "," + y1 + ' z"/>';
}
function railEnd(ch, T2, B) {
  if (!ch) return null;
  if (/[pPlL]/.test(ch)) return B;
  if (/[nNhH]/.test(ch)) return T2;
  return waveLevel(ch, T2, null, B);
}
function waveGap(X, T2, B) {
  var t = T2 - 2, b = B + 2;
  var mask = "M" + (X + 7) + "," + t + " L" + (X + 3) + "," + t + " C" + (X - 2) + "," + t + " " + (X - 2) + "," + b + " " + (X - 7) + "," + b + " L" + (X - 3) + "," + b + " C" + (X + 2) + "," + b + " " + (X + 2) + "," + t + " " + (X + 7) + "," + t + " z";
  var c1 = "M" + (X - 7) + "," + b + " C" + (X - 2) + "," + b + " " + (X - 2) + "," + t + " " + (X + 3) + "," + t;
  var c2 = "M" + (X - 3) + "," + b + " C" + (X + 2) + "," + b + " " + (X + 2) + "," + t + " " + (X + 7) + "," + t;
  return '<g class="waveGapG" pointer-events="none"><path d="' + mask + '" fill="var(--bg)" stroke="none"/><path class="waveInk" d="' + c1 + '"/><path class="waveInk" d="' + c2 + '"/></g>';
}
function waveGlyph(ch, prev, X, T2, M, B, W, opt) {
  var o = [], x1 = X + W, o2 = opt || {}, ax = o2.arrowX === void 0 ? X : o2.arrowX;
  var px = X + 3, ex = X + Math.min(W * 0.24, 9);
  if (!(Core.BUS.test(ch) || Core.CLOCK.test(ch) || /[01xzud]/.test(ch))) ch = "x";
  if (Core.BUS.test(ch)) {
    var seg = o2.seg || "only";
    var cls = o2.cls || BUS_CLASS[ch] || "bus2";
    var lj = seg === "mid" || seg === "end", rj = seg === "mid" || seg === "start";
    var fp;
    if (lj && rj) fp = [X, T2, x1, T2, x1, B, X, B];
    else if (lj) fp = [X, T2, x1 - 3, T2, x1, M, x1 - 3, B, X, B];
    else if (rj) fp = [X, M, X + 3, T2, x1, T2, x1, B, X + 3, B];
    else fp = [X + 3, T2, x1 - 3, T2, x1, M, x1 - 3, B, X + 3, B, X, M];
    o.push('<polygon class="waveBus ' + cls + '" points="' + fp.join(",") + '" stroke="none"/>');
    var bd = "M" + X + "," + T2 + " H" + x1 + " M" + X + "," + B + " H" + x1;
    if (!lj) bd += " M" + X + "," + M + " L" + (X + 3) + "," + T2 + " M" + X + "," + M + " L" + (X + 3) + "," + B;
    if (!rj) bd += " M" + (x1 - 3) + "," + T2 + " L" + x1 + "," + M + " L" + (x1 - 3) + "," + B;
    o.push('<path class="waveBusInk" d="' + bd + '"/>');
  } else if (Core.CLOCK.test(ch)) {
    var up = /[pPhH]/.test(ch), pl = prev ? railEnd(prev, T2, B) : null, d;
    if (/[pPnN]/.test(ch)) {
      var first = up ? T2 : B, second = up ? B : T2, start = pl === first ? first : second;
      d = "M" + X + "," + start + (start === first ? "" : " V" + first) + " H" + (X + W / 2) + " V" + second + " H" + x1;
    } else {
      var lev = up ? T2 : B;
      d = pl === lev ? "M" + X + "," + lev + " H" + x1 : "M" + X + "," + (up ? B : T2) + " V" + lev + " H" + x1;
    }
    o.push('<path class="waveInk" d="' + d + '"/>');
    if (/[PHNL]/.test(ch)) o.push(waveArrow(ax, T2, B, up));
  } else if (ch === "x") {
    o.push('<path class="waveInk" d="M' + X + "," + T2 + " H" + x1 + '"/><path class="waveInk" d="M' + X + "," + B + " H" + x1 + '"/>');
    o.push(waveHatch(X, x1, T2, B, W));
  } else {
    var cy = waveLevel(ch, T2, M, B);
    if (cy === null) cy = M;
    var py = prev ? waveLevel(prev, T2, M, B) : null;
    var vary = py !== null && Math.abs(py - cy) > 1;
    var d = vary ? "M" + X + "," + py + " H" + px + " L" + ex + "," + cy + " H" + x1 : "M" + X + "," + cy + " H" + x1;
    o.push('<path class="' + (ch === "d" || ch === "u" ? "waveDash" : "waveInk") + '" d="' + d + '"/>');
  }
  return '<g class="waveGlyph" data-w="' + esc(ch) + '" pointer-events="none">' + o.join("") + "</g>";
}
function busClassOf(ch) {
  return BUS_CLASS[ch] || "bus2";
}
function charEm(ch) {
  return /[\u2e80-\u9fff\u3000-\u303f\uf900-\ufaff\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 1 : 0.56;
}
function fitLabel(text, room, size) {
  var s = String(text === null || text === void 0 ? "" : text);
  if (!s) return "";
  var em = size || 10, w = 0, i = 0, c;
  for (; i < s.length; i++) {
    c = charEm(s[i]) * em;
    if (w + c > room) break;
    w += c;
  }
  if (i >= s.length) return s;
  var budget = room - charEm("\u2026") * em;
  w = 0;
  for (i = 0; i < s.length; i++) {
    c = charEm(s[i]) * em;
    if (w + c > budget) break;
    w += c;
  }
  return (s.slice(0, i) || s.charAt(0)) + "\u2026";
}
function chipGlyph(v) {
  return waveGlyph(v, null, 0, 5, 13, 21, CHIP_W, { arrowX: 3 });
}
function chipDesc(v) {
  if (Core.BUS.test(v)) return v === "=" || v === "2" ? "bus data block (white)" : "bus data block, colour " + (Number(v) + 5);
  if (Core.CLOCK.test(v)) return {
    p: "clock, rising start",
    P: "clock, rising start with arrow",
    n: "clock, falling start",
    N: "clock, falling start with arrow",
    h: "high, rising edge",
    H: "high, rising edge with arrow",
    l: "low, falling edge",
    L: "low, falling edge with arrow"
  }[v];
  return {
    "1": "high",
    "0": "low",
    "x": "unknown (hatched)",
    "z": "high-Z (mid line)",
    "u": "pull-up (dashed high)",
    "d": "pull-down (dashed low)"
  }[v] || "wave character";
}

// ../TimingBench/src/editor/shapes.js
var T = TOUCH;
var BASE_CELL = G.CELL;
var CELL = BASE_CELL;
var NAME_W = G.NAME_W;
var ROW_H = G.ROW_H;
var TOP = G.TOP;
var PAD = G.PAD;
var ACT_W = G.ACT_W;
var RO_ROW_H = 40;
var COL_Y = G.COL_Y;
var XS = G.XS;
var GSLOT = T ? 30 : 24;
function gripDots(x, y, cols, rows) {
  var out = "", dx = 3.4, dy = 3.4, d = 2.3, r = 1.15;
  for (var j = 0; j < rows; j++) {
    for (var i = 0; i < cols; i++) {
      out += '<rect x="' + (x + (i - (cols - 1) / 2) * dx - d / 2).toFixed(1) + '" y="' + (y + (j - (rows - 1) / 2) * dy - d / 2).toFixed(1) + '" width="' + d + '" height="' + d + '" rx="' + r + '"/>';
    }
  }
  return out;
}
function createShapes(ctx) {
  var state = ctx.state, wrap = ctx.wrap;
  function rowH() {
    return state.readonly && state.embedCard ? RO_ROW_H : ROW_H;
  }
  var SC = "deskEdit";
  function can2(name) {
    return can(name, SC);
  }
  var measEl = null, measTxt = null, measKey = "", measW = 0;
  function measure(text, size) {
    if (!measEl) {
      measEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      measEl.setAttribute("class", "measure");
      measEl.setAttribute("aria-hidden", "true");
      measTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      measEl.appendChild(measTxt);
      document.body.appendChild(measEl);
    }
    measTxt.textContent = text;
    measTxt.setAttribute("font-size", String(size));
    try {
      return measTxt.getBBox().width;
    } catch (e) {
      return text.length * size * 0.6;
    }
  }
  function nameBlockWidth(ir) {
    var l, w, max = 0, withMeta = can2("laneMeta");
    for (var i = 0; i < ir.lanes.length; i++) {
      l = ir.lanes[i];
      if (l.kind === "spacer") continue;
      w = measure(l.name, 12);
      if (withMeta) {
        w += measure(" \u03C6" + l.phase, 9) + measure(" T" + l.period, 9);
      }
      if (w > max) max = w;
    }
    return max;
  }
  function groupDepth(lanes) {
    var d = 0;
    lanes.forEach(function(l) {
      if ((l.groupPath || []).length > d) d = l.groupPath.length;
    });
    return d;
  }
  function groupRuns(lanes, depthMax) {
    var out = [];
    if (depthMax === void 0) depthMax = groupDepth(lanes);
    for (var d = 0; d < depthMax; d++) {
      var i = 0;
      while (i < lanes.length) {
        var gp = lanes[i].groupPath || [];
        if (gp.length <= d) {
          i++;
          continue;
        }
        var pref = gp.slice(0, d + 1).join("/"), j = i;
        while (j + 1 < lanes.length) {
          var g2 = lanes[j + 1].groupPath || [];
          if (g2.length <= d || g2.slice(0, d + 1).join("/") !== pref) break;
          j++;
        }
        out.push({ name: gp[d], depth: d, from: i, to: j });
        i = j + 1;
      }
    }
    return out;
  }
  function parseEdge(s) {
    var m = /^([A-Za-z0-9_]+)([<>~\-|+]*)([A-Za-z0-9_]+)(?:\s+([\s\S]*))?$/.exec(String(s).trim());
    if (!m) return null;
    var tok = m[2] || "";
    return {
      from: m[1],
      to: m[3],
      label: (m[4] || "").trim(),
      start: tok.indexOf("<") >= 0,
      end: tok.indexOf(">") >= 0,
      shape: tok.replace(/[<>]/g, "")
    };
  }
  var EDGE_SHAPES = {
    "": "spline",
    "~": "spline",
    "-": "line",
    "-|": "hv",
    "|-": "vh",
    "-|-": "hvh",
    "-~": "swing1",
    "~-": "swing2",
    "+": "tee"
  };
  function arrowTri(tip, from) {
    var ux = tip.x - from.x, uy = tip.y - from.y, ul = Math.sqrt(ux * ux + uy * uy) || 1;
    ux /= ul;
    uy /= ul;
    var back = 7.5, half = 3.2;
    var abx = tip.x - ux * back, aby = tip.y - uy * back, apx = -uy, apy = ux;
    return "M" + tip.x + "," + tip.y + " L" + (abx + apx * half) + "," + (aby + apy * half) + " L" + (abx - apx * half) + "," + (aby - apy * half) + " z";
  }
  function edgePath(a, b, shape) {
    var kind = EDGE_SHAPES[shape] || "spline";
    var i, pts;
    if (kind === "spline" || kind === "swing1" || kind === "swing2") {
      var dx = b.x - a.x, dy = b.y - a.y, c1, c2;
      if (kind === "spline") {
        c1 = { x: a.x + 10, y: a.y - 26 };
        c2 = { x: b.x - 10, y: b.y - 26 };
      } else if (kind === "swing1") {
        c1 = { x: a.x + 0.7 * dx, y: a.y };
        c2 = { x: b.x - 0.05 * dx, y: b.y - 0.05 * dy };
      } else {
        c1 = { x: a.x + 0.05 * dx, y: a.y + 0.05 * dy };
        c2 = { x: a.x + 0.3 * dx, y: b.y };
      }
      return {
        d: "M" + a.x + "," + a.y + " C" + c1.x + "," + c1.y + " " + c2.x + "," + c2.y + " " + b.x + "," + b.y,
        endFrom: c2,
        startFrom: c1,
        kind
      };
    }
    pts = [{ x: a.x, y: a.y }];
    if (kind === "line" || kind === "tee") pts.push({ x: b.x, y: b.y });
    else if (kind === "hv") {
      pts.push({ x: b.x, y: a.y });
      pts.push({ x: b.x, y: b.y });
    } else if (kind === "vh") {
      pts.push({ x: a.x, y: b.y });
      pts.push({ x: b.x, y: b.y });
    } else {
      var mx = (a.x + b.x) / 2;
      pts.push({ x: mx, y: a.y });
      pts.push({ x: mx, y: b.y });
      pts.push({ x: b.x, y: b.y });
    }
    var d = "M" + pts[0].x + "," + pts[0].y;
    for (i = 1; i < pts.length; i++) d += " L" + pts[i].x + "," + pts[i].y;
    return { d, endFrom: pts[pts.length - 2], startFrom: pts[1], kind };
  }
  function edgeLabelAt(a, b, kind) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (kind === "hv") return { x: b.x - 8, y: my, anchor: "end" };
    if (kind === "vh") return { x: a.x + 8, y: my, anchor: "start" };
    if (kind === "hvh") return { x: mx + 8, y: my, anchor: "start" };
    if (kind === "line" || kind === "tee") return { x: mx, y: my - 12, anchor: "middle" };
    return { x: mx, y: my - 22, anchor: "middle" };
  }
  function edgeArcs(ir) {
    var map = {};
    ir.lanes.forEach(function(l, li) {
      if (l.kind !== "signal") return;
      l.node.forEach(function(ch, t) {
        if (ch && ch !== "." && !map[ch]) map[ch] = { x: cellGeo(l, t).cx, y: TOP + li * rowH() + 7 };
      });
    });
    var o = [];
    ir.edges.forEach(function(e, i) {
      var pe = parseEdge(e);
      if (!pe) return;
      var a = map[pe.from], b = map[pe.to];
      if (!a || !b) return;
      var g = edgePath(a, b, pe.shape), paths = [];
      paths.push('<path d="' + g.d + '" fill="none" stroke="var(--accent)" stroke-width="1" opacity=".75" pointer-events="none"/>');
      if (pe.end) paths.push('<path d="' + arrowTri(b, g.endFrom) + '" fill="var(--accent)" opacity=".85" pointer-events="none"/>');
      if (pe.start) paths.push('<path d="' + arrowTri(a, g.startFrom) + '" fill="var(--accent)" opacity=".85" pointer-events="none"/>');
      if (g.kind === "tee") {
        var ux = b.x - a.x, uy = b.y - a.y, ul = Math.sqrt(ux * ux + uy * uy) || 1;
        var nx = -uy / ul * 5, ny = ux / ul * 5;
        paths.push('<path d="M' + (a.x - nx) + "," + (a.y - ny) + " L" + (a.x + nx) + "," + (a.y + ny) + " M" + (b.x - nx) + "," + (b.y - ny) + " L" + (b.x + nx) + "," + (b.y + ny) + '" stroke="var(--accent)" stroke-width="1" pointer-events="none"/>');
      }
      paths.push('<path d="' + g.d + '" fill="none" stroke="rgba(0,0,0,0.001)" stroke-width="' + (T ? 20 : 8) + '" pointer-events="' + (state.linkMode ? "none" : "stroke") + '"/>');
      var inner = paths.join("");
      if (pe.label) {
        var la = edgeLabelAt(a, b, g.kind), lw = Math.max(22, pe.label.length * 6 + 10);
        var lx = la.anchor === "end" ? la.x - lw : la.anchor === "start" ? la.x : la.x - lw / 2;
        inner += '<rect x="' + lx + '" y="' + (la.y - 9) + '" width="' + lw + '" height="16" rx="4" fill="var(--panel)" stroke="var(--line)" stroke-width="0.5" pointer-events="none"/><text x="' + la.x + '" y="' + (la.y + 1) + '" text-anchor="' + la.anchor + '" dominant-baseline="central" font-size="9" fill="var(--accent)" pointer-events="none">' + esc(cut(pe.label, 18)) + "</text>";
      }
      o.push('<g class="edgeArc" data-eidx="' + i + '" role="button" aria-label="Edit edge ' + esc(String(e)) + '">' + inner + "</g>");
    });
    return o.join("");
  }
  function emptyRow(W) {
    var h = rowH(), cy = TOP + h / 2;
    var px = XS + Math.round(CELL * 0.5), wx = XS + Math.round(CELL * 1.6), ww = Math.round(CELL * 2.2);
    return '<g class="emptyRow" data-act="addFirst" role="button" aria-label="Add the first signal row"><rect x="' + (PAD + 2) + '" y="' + (TOP + 2) + '" width="' + (W - PAD * 2 - 4) + '" height="' + (h - 4) + '" rx="6" fill="none" stroke="var(--line2)" stroke-width="1" stroke-dasharray="4 4"/><path class="emptyWave" d="M' + wx + "," + (cy + 7) + "H" + (wx + Math.round(ww * 0.3)) + "V" + (cy - 7) + "H" + (wx + Math.round(ww * 0.66)) + "V" + (cy + 7) + "H" + (wx + ww) + '" fill="none" stroke="var(--muted)" stroke-width="1.2" opacity=".38" stroke-linejoin="round"/><rect class="plusBox" x="' + (px - (T ? 15 : 13)) + '" y="' + (cy - (T ? 15 : 13)) + '" width="' + (T ? 30 : 26) + '" height="' + (T ? 30 : 26) + '" rx="' + (T ? 15 : 13) + '" fill="none" stroke="var(--accent)" stroke-width="1.2"/><path d="M' + (px - (T ? 6 : 5)) + "," + cy + "h" + (T ? 12 : 10) + "M" + px + "," + (cy - (T ? 6 : 5)) + "v" + (T ? 12 : 10) + '" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/></g>';
  }
  function redraw() {
    if (ctx.inlineCtx) ctx.closeInline(true);
    var ir = state.ir;
    if (!ir) return;
    SC = sceneOf(state);
    CELL = G.CELL = BASE_CELL * hscaleOf(ir);
    var nameKey = SC + "|" + ir.lanes.map(function(l) {
      if (l.kind === "spacer") return "";
      var ph = state.phaseEdit && state.phaseEdit.lane === l.id ? "~" : l.phase;
      return l.name + "/" + ph + "/" + l.period + "/" + (l.groupPath || []).join(">");
    }).join(";");
    if (nameKey !== measKey) {
      measKey = nameKey;
      measW = nameBlockWidth(ir);
    }
    var hndSlot = can2("hud") ? 14 : 0;
    var gDepth = groupDepth(ir.lanes);
    var leftBound = PAD + hndSlot + gDepth * GSLOT;
    var minW = 64, maxW = T ? 300 : 260;
    var rawW = Math.max(minW, Math.min(maxW, leftBound + measW + 16));
    NAME_W = Math.min(maxW, Math.ceil(rawW / 8) * 8);
    XS = NAME_W + 8;
    G.NAME_W = NAME_W;
    G.XS = XS;
    var N = ir.ticks;
    var COLS = 0, negExtent = 0;
    ir.lanes.forEach(function(l) {
      if (l.kind !== "signal") return;
      COLS = Math.max(COLS, laneChars(l, N) * lanePeriod(l));
      var sh = laneShift(l);
      if (sh < 0) negExtent = Math.max(negExtent, -sh);
    });
    var ACT_X = XS + (COLS + negExtent) * CELL;
    var viewW = Math.max(240, Math.round(wrap.clientWidth || 0) || 360);
    var roTrimTop = Math.max(0, TOP - 6);
    var roTrimBottom = 6;
    var RH = rowH();
    var tight = state.readonly && state.embedCard;
    var bandT = tight ? 0.1 : 0.25, bandM = tight ? 0.5 : 0.48, bandB = tight ? 0.9 : 0.71;
    var roW = Math.max(ACT_X + PAD, 360);
    var roBottomY = function() {
      return ir.lanes.length === 0 ? TOP + RH : TOP + ir.lanes.length * RH;
    }();
    var roH = roBottomY + 4 + roTrimBottom - roTrimTop;
    state.roBox = { w: roW, h: roH };
    var W = state.readonly ? roW : Math.max(ACT_X + ACT_W + PAD, viewW, 560);
    var bottom = TOP + ir.lanes.length * RH;
    var isEmpty = ir.lanes.length === 0;
    if (isEmpty) bottom = TOP + RH;
    var actY = bottom + 4;
    var contentH = bottom + (state.embedCard && state.readonly ? roTrimBottom : 6);
    var H = contentH, c, x;
    var vbTop = state.embedCard && state.readonly ? roTrimTop : 0;
    var vbH = H - vbTop;
    var rawFit = viewW > 0 ? viewW / W : 1;
    var fsBig = !!state.embedCard && !state.readonly && !!state.fsEdit;
    var baseFit = fsBig ? Math.min(2, Math.max(1, rawFit)) : state.embedCard && state.readonly ? Math.min(2, rawFit) : T || state.embedCard ? Math.min(1, rawFit) : 1;
    var availH = wrap.clientHeight || 0;
    var fitView = Math.min(1, rawFit, availH > 0 ? availH / H : 1);
    var zoomMin = Math.min(1, Math.max(ZOOM_MIN, fitView / baseFit));
    var zoom = clampZoom(state.zoom, zoomMin);
    var fit = baseFit * zoom;
    var baseOutW = baseFit < 1 ? viewW : Math.round(W * baseFit);
    var outW = zoom === 1 ? baseOutW : Math.round(baseOutW * zoom);
    var outH = Math.round(vbH * outW / W);
    state.barY = actY;
    state.viewW = viewW;
    state.fit = outW / W;
    state.baseFit = baseFit;
    state.vbH = vbH;
    state.zoom = zoom;
    state.zoomMin = zoomMin;
    state.baseOutW = baseOutW;
    var outW0 = baseOutW;
    state.contentH = state.embedCard ? Math.round(vbH * outW0 / W) : contentH;
    state.W = W;
    state.H = H;
    var o = ['<svg width="' + outW + '" height="' + outH + '" viewBox="0 ' + vbTop + " " + W + " " + vbH + '" preserveAspectRatio="xMidYMin meet" class="' + (state.linkMode ? "linkMode" : "") + '" role="img" aria-label="Timing diagram editor">'];
    o.push('<rect x="0" y="0" width="' + W + '" height="' + (TOP - 12) + '" fill="var(--bg)"/>');
    var gridTop = state.readonly ? vbTop + 4 : TOP - 10;
    for (c = 0; c <= COLS; c++) {
      x = XS + c * CELL;
      o.push('<line class="colGrid" x1="' + x + '" y1="' + gridTop + '" x2="' + x + '" y2="' + bottom + '" stroke="var(--line)" stroke-width="0.5"/>');
    }
    if (can2("colhead")) for (c = 0; c <= N && !isEmpty; c++) {
      var cx = XS + c * CELL + CELL / 2, selc = state.sel === c, ghost = c === N;
      o.push('<g class="colhead' + (selc ? " sel" : "") + (ghost ? " ghost" : "") + '" data-c="' + c + '" role="img" aria-label="Column ' + c + (ghost ? " \u2014 append a cycle" : "") + '">');
      o.push('<rect class="colBand" x="' + (XS + c * CELL + 1) + '" y="' + TOP + '" width="' + (CELL - 2) + '" height="' + Math.max(0, bottom - TOP) + '" rx="2" fill="none" pointer-events="none"/>');
      o.push('<rect x="' + (XS + c * CELL + 1) + '" y="' + (COL_Y - 2) + '" width="' + (CELL - 2) + '" height="' + (TOP - COL_Y - 2) + '" fill="transparent"/>');
      var gs = T ? 28 : 20;
      if (ghost) o.push('<rect x="' + (cx - gs / 2) + '" y="' + COL_Y + '" width="' + gs + '" height="' + gs + '" rx="4" fill="none" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="2 2"/>');
      var colHnd = state.selCell && state.selCell.tick === c || state.sel === c;
      if (colHnd && !ghost) {
        var gy = COL_Y + gs / 2;
        o.push('<g class="hnd hndCol" data-col="' + c + '" role="button" aria-label="Drag to move this column" fill="var(--muted)">' + gripDots(cx, gy, 3, 2) + '<rect x="' + (cx - 9) + '" y="' + (gy - 6) + '" width="18" height="12" fill="transparent" style="cursor:grab"/></g>');
      }
      o.push("</g>");
    }
    if (isEmpty) o.push(emptyRow(W));
    var clips = [];
    ir.lanes.forEach(function(l, li) {
      if (l.kind !== "signal" || laneShift(l) <= 0) return;
      var w = laneChars(l, N) * lanePeriod(l) * CELL;
      clips.push('<clipPath id="lclip-' + l.id + '"><rect x="' + XS + '" y="' + (TOP + li * RH) + '" width="' + w + '" height="' + RH + '"/></clipPath>');
    });
    if (clips.length) o.push("<defs>" + clips.join("") + "</defs>");
    var spanSet = {};
    (state.selRows || []).forEach(function(id) {
      spanSet[id] = 1;
    });
    ir.lanes.forEach(function(l, li) {
      var y = TOP + li * RH;
      var yT = y + Math.round(RH * bandT), yM = y + Math.round(RH * bandM), yB = y + Math.round(RH * bandB);
      var cellSel = !!(state.selCell && state.selCell.lane === l.id);
      var rowSel = state.selLane === l.id && !cellSel;
      var cellH = Math.max(10, RH - 10), i, hi = rowSel || !!spanSet[l.id];
      o.push('<g class="laneGrp' + (hi ? " sel" : "") + '" data-lane="' + l.id + '">');
      var hiW = Math.max(24, ACT_X - PAD);
      if (hi) o.push('<rect class="laneHi" x="' + PAD + '" y="' + (y + 1) + '" width="' + hiW + '" height="' + (RH - 2) + '" rx="3" fill="var(--accent-bg)" pointer-events="none"/>');
      o.push('<rect class="laneRow" data-lane="' + l.id + '" x="' + PAD + '" y="' + (y + 1) + '" width="' + (W - PAD * 2) + '" height="' + (RH - 2) + '" rx="3" fill="transparent" style="cursor:pointer"/>');
      o.push('<rect class="laneHead' + (cellSel ? " cur" : "") + '" data-lane="' + l.id + '" x="' + PAD + '" y="' + (y + 1) + '" width="' + Math.max(12, XS - 8 - PAD) + '" height="' + (RH - 2) + '" rx="3" fill="transparent" style="cursor:pointer"/>');
      if (l.kind === "signal" && (cellSel || state.selLane === l.id)) {
        var hx = PAD + 7;
        o.push('<g class="hnd hndRow" data-lane="' + l.id + '" role="button" aria-label="Drag to move this row" fill="var(--muted)">' + gripDots(hx, yM, 2, 3) + '<rect x="' + (hx - 7) + '" y="' + (yM - 9) + '" width="14" height="18" fill="transparent" style="cursor:grab"/></g>');
      }
      if (l.kind === "spacer") {
        if (can2("spacerMark")) {
          o.push('<line x1="' + XS + '" y1="' + yM + '" x2="' + ACT_X + '" y2="' + yM + '" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="2 5"/>');
          o.push('<text x="' + (XS + 8) + '" y="' + (yM - 6) + '" font-size="9" fill="var(--muted)">spacer</text>');
        }
        o.push("</g>");
        return;
      }
      var meta = "", metaHit = "";
      if (can2("laneMeta")) {
        meta = '<tspan class="laneMeta" data-act="phase" data-lane="' + l.id + '" font-size="9" fill="var(--muted)"> \u03C6' + l.phase + '</tspan><tspan class="laneMeta" data-act="period" data-lane="' + l.id + '" font-size="9" fill="var(--muted)"> T' + l.period + "</tspan>";
        if (T) {
          var mR = NAME_W - 6, wPer = measure(" T" + l.period, 9), wPhi = measure(" \u03C6" + l.phase, 9);
          var mP = mR - wPer, mPL = mP - wPhi - 3;
          metaHit = '<rect class="laneMetaHit" data-act="phase" data-lane="' + l.id + '" x="' + mPL.toFixed(1) + '" y="' + (y + 1) + '" width="' + (mP - mPL).toFixed(1) + '" height="' + (RH - 2) + '" fill="transparent" pointer-events="all" style="cursor:pointer"/><rect class="laneMetaHit" data-act="period" data-lane="' + l.id + '" x="' + (mP - 1).toFixed(1) + '" y="' + (y + 1) + '" width="' + (mR - mP + 1).toFixed(1) + '" height="' + (RH - 2) + '" fill="transparent" pointer-events="all" style="cursor:pointer"/>';
        }
      }
      o.push('<text class="laneName" data-lane="' + l.id + '" x="' + (NAME_W - 6) + '" y="' + yM + '" text-anchor="end" dominant-baseline="central" font-size="12" fill="var(--ink)"><tspan class="laneNameText" data-act="name">' + esc(l.name) + "</tspan>" + meta + "</text>");
      if (metaHit) o.push(metaHit);
      var P = lanePeriod(l), sh = laneShift(l), cw = P * CELL, chars = laneChars(l, N);
      var clipId = sh > 0 ? "lclip-" + l.id : null;
      var lastW = l.slots.length ? l.slots[l.slots.length - 1].w : "x";
      var wsAt = function(k) {
        var q2 = k < l.slots.length ? l.slots[k] : null;
        return q2 ? q2.w : lastW;
      };
      var ptAt = function(k) {
        var q2 = k < l.slots.length ? l.slots[k] : null;
        return q2 ? q2.point && !q2.gap : false;
      };
      if (clipId) o.push('<g clip-path="url(#' + clipId + ')">');
      for (i = 0; i < chars; i++) {
        var s = i < l.slots.length ? l.slots[i] : null, x0 = cellGeo(l, i).x0, w = s ? s.w : lastW;
        var prevCh = i > 0 ? wsAt(i - 1) : null;
        var gopt = {};
        if (Core.BUS.test(w)) {
          var ljoin = i > 0 && !ptAt(i) && Core.BUS.test(wsAt(i - 1));
          var rjoin = i + 1 < chars && !ptAt(i + 1) && Core.BUS.test(wsAt(i + 1));
          gopt.seg = ljoin ? rjoin ? "mid" : "end" : rjoin ? "start" : "only";
          gopt.cls = busClassOf(w);
        }
        var glyph = waveGlyph(w, prevCh, x0, yT, yM, yB, cw, gopt);
        o.push(s ? glyph : '<g class="tailSlot" role="img" aria-label="Undefined period \u2014 tap to extend">' + glyph + "</g>");
        if (s && s.gap) o.push(waveGap(x0, yT, yB));
        var rx = Math.max(x0 + 1, XS);
        var ccur = state.phaseEdit && state.phaseEdit.lane === l.id ? "ew-resize" : "crosshair";
        o.push('<rect class="cell' + (s ? "" : " tailCell") + '" data-lane="' + l.id + '" data-tick="' + i + '"' + (s ? "" : ' data-tail="1"') + ' x="' + rx + '" y="' + (y + 3) + '" width="' + Math.max(1, x0 + cw - 1 - rx) + '" height="' + cellH + '" fill="transparent" style="cursor:' + ccur + '"/>');
      }
      var run = 0;
      while (run < chars) {
        if (!Core.BUS.test(wsAt(run))) {
          run++;
          continue;
        }
        var runEnd = run;
        while (runEnd + 1 < chars && Core.BUS.test(wsAt(runEnd + 1)) && !ptAt(runEnd + 1)) runEnd++;
        var lb2 = null;
        for (var q = run; q <= runEnd; q++) {
          var sq = l.slots[q];
          if (sq && sq.point && !sq.gap && sq.label !== null && sq.label !== void 0 && sq.label !== "") {
            lb2 = sq.label;
            break;
          }
        }
        if (lb2 !== null) {
          var lx0 = cellGeo(l, run).x0, lx1 = cellGeo(l, runEnd).x0 + cellGeo(l, runEnd).w;
          o.push('<text class="waveLabel" x="' + ((lx0 + lx1) / 2).toFixed(1) + '" y="' + (yM + 1) + '" text-anchor="middle" dominant-baseline="central">' + esc(fitLabel(lb2, Math.max(10, lx1 - lx0 - 4), 10)) + "</text>");
        }
        run = runEnd + 1;
      }
      o.push('<line x1="' + XS + '" y1="' + (y + RH) + '" x2="' + ACT_X + '" y2="' + (y + RH) + '" stroke="var(--line)" stroke-width="0.5"/>');
      o.push('<rect class="waveZone" data-lane="' + l.id + '" x="' + XS + '" y="' + (y + Math.round(RH * bandT)) + '" width="' + chars * P * CELL + '" height="' + Math.round(RH * (bandB - bandT)) + '" fill="none" stroke="none" pointer-events="none"/>');
      for (i = 0; i < chars && i < l.node.length; i++) {
        var nc = l.node[i];
        if (!nc || nc === ".") continue;
        o.push('<text class="waveNode" x="' + (cellGeo(l, i).cx + 8) + '" y="' + (yT - 2) + '" text-anchor="middle" font-size="10" fill="var(--accent)">' + esc(nc) + "</text>");
      }
      if (clipId) o.push("</g>");
      if (state.phaseEdit && state.phaseEdit.lane === l.id) {
        var prow = ACT_X - 8 - XS;
        var pgo = [
          '<g class="phaseTrackG">',
          '<rect class="phaseTrack" data-lane="' + l.id + '" x="' + XS + '" y="' + (y + 2) + '" width="' + prow + '" height="' + (RH - 4) + '" rx="4" fill="var(--accent)" fill-opacity="0.1" pointer-events="none"/>'
        ];
        for (var pk = 0; pk * 0.5 <= PHASE_MAX + 1e-9; pk++) {
          var ptx = XS + pk * 0.5 * CELL;
          if (ptx > XS + prow - 2) break;
          pgo.push('<line x1="' + ptx + '" x2="' + ptx + '" y1="' + (y + 3) + '" y2="' + (y + 7) + '" stroke="var(--accent)" stroke-opacity="' + (pk % 2 ? 0.25 : 0.5) + '" stroke-width="1" pointer-events="none"/>');
        }
        o.push(pgo.join(""));
      }
      o.push("</g>");
    });
    var gEdit = can2("laneMeta");
    groupRuns(ir.lanes, gDepth).forEach(function(g) {
      var y0 = TOP + g.from * RH + 4, y1 = TOP + (g.to + 1) * RH - 4, h = y1 - y0;
      if (h < 10) return;
      var bx = PAD + hndSlot + g.depth * GSLOT + GSLOT - 6, cy = (y0 + y1) / 2, lx = bx - 10;
      var brace = "M" + bx + "," + y0 + " c -3,0 -5,2 -5,5 l 0," + (h - 10) + " c 0,3 2,5 5,5";
      var gpath = ir.lanes[g.from].groupPath.slice(0, g.depth + 1).join("/");
      var hit = gEdit ? '<rect class="groupHit" data-group="' + esc(gpath) + '" x="' + (bx - GSLOT) + '" y="' + y0 + '" width="' + GSLOT + '" height="' + h + '" fill="transparent" style="cursor:text"/>' : "";
      o.push('<g class="groupBrace"><path d="' + brace + '" fill="none" stroke="var(--accent)" stroke-width="1" pointer-events="none"/>' + hit + '<text class="laneGroupName"' + (gEdit ? ' data-act="group" data-group="' + esc(gpath) + '"' : "") + ' x="' + lx + '" y="' + cy + '" transform="rotate(-90 ' + lx + " " + cy + ')" text-anchor="middle" font-size="12" fill="var(--accent)"' + (gEdit ? ' style="cursor:text"' : "") + ">" + esc(g.name) + "</text></g>");
    });
    o.push(edgeArcs(ir));
    function selBox(l, tick) {
      var g = cellGeo(l, tick), x2 = Math.max(g.x0 + 1, XS);
      return { x: x2, w: Math.max(1, g.x0 + g.w - 1 - x2) };
    }
    if (state.linkMode && state.linkCursor) {
      var lcLane = null, lci = -1;
      ir.lanes.forEach(function(l, k) {
        if (l.id === state.linkCursor.lane) {
          lci = k;
          lcLane = l;
        }
      });
      if (lcLane && lci >= 0 && state.linkCursor.tick < laneChars(lcLane, N)) {
        var lb = selBox(lcLane, state.linkCursor.tick);
        o.push('<rect class="linkCursor" x="' + lb.x + '" y="' + (TOP + lci * RH + 3) + '" width="' + lb.w + '" height="' + (RH - 10) + '" rx="3" role="img" aria-label="Link endpoint cursor"></rect>');
      }
    }
    if (!state.linkMode && state.selCell) {
      var scLane = null, sli = -1;
      ir.lanes.forEach(function(l, k) {
        if (l.id === state.selCell.lane) {
          sli = k;
          scLane = l;
        }
      });
      if (scLane && sli >= 0 && state.selCell.tick < laneChars(scLane, N)) {
        var sb = selBox(scLane, state.selCell.tick);
        o.push('<rect class="cellSel" x="' + sb.x + '" y="' + (TOP + sli * RH + 3) + '" width="' + sb.w + '" height="' + (RH - 10) + '" rx="3"/>');
      }
    }
    o.push("</svg>");
    wrap.innerHTML = o.join("");
    ctx.renderGutter();
  }
  ctx.redraw = redraw;
  function applyZoom() {
    var svg = wrap.querySelector("svg");
    if (!svg || !state.W || !state.baseFit) return false;
    var zoom = clampZoom(state.zoom, state.zoomMin);
    var baseOutW = state.baseOutW || (state.baseFit < 1 ? state.viewW : Math.round(state.W * state.baseFit));
    var outW = zoom === 1 ? baseOutW : Math.round(baseOutW * zoom);
    var outH = Math.round((state.vbH || state.H) * outW / state.W);
    svg.setAttribute("width", outW);
    svg.setAttribute("height", outH);
    state.zoom = zoom;
    state.fit = outW / state.W;
    if (wrap.classList) wrap.classList.toggle("is-zoom", Math.abs(zoom - 1) > 1e-3);
    return true;
  }
  function anchorScroll(ux, uy, cx, cy) {
    var svg = wrap.querySelector("svg");
    if (!svg) return false;
    var vb = svg.viewBox && svg.viewBox.baseVal, r = svg.getBoundingClientRect();
    if (!vb || !r.width || !vb.width) return false;
    var px = r.left + (ux - vb.x) * r.width / vb.width;
    var py = r.top + (uy - vb.y) * r.height / vb.height;
    if (px !== cx) wrap.scrollLeft += px - cx;
    if (py !== cy) wrap.scrollTop += py - cy;
    return true;
  }
  function setZoom(z, cx, cy) {
    var svg = wrap.querySelector("svg");
    if (!svg || !state.W) return false;
    var before = state.zoom || 1, next = clampZoom(z, state.zoomMin);
    if (Math.abs(next - before) < 1e-3) return false;
    var r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    var ax = cx === void 0 ? r.left + wrap.clientWidth / 2 : cx;
    var ay = cy === void 0 ? r.top + wrap.clientHeight / 2 : cy;
    var ux = vb ? (ax - r.left) * vb.width / r.width + vb.x : 0;
    var uy = vb ? (ay - r.top) * vb.height / r.height + vb.y : 0;
    state.zoom = next;
    if (!applyZoom()) {
      state.zoom = before;
      return false;
    }
    anchorScroll(ux, uy, ax, ay);
    return true;
  }
  ctx.applyZoom = applyZoom;
  ctx.anchorScroll = anchorScroll;
  ctx.setZoom = setZoom;
  return { redraw };
}

// ../TimingBench/src/editor/interactions.js
var ROW_H2 = G.ROW_H;
var TOP2 = G.TOP;
function attachInteractions(ctx) {
  var state = ctx.state, code = ctx.code, wrap = ctx.wrap;
  function findLane(id) {
    var l = null;
    if (state.ir && id) state.ir.lanes.forEach(function(x) {
      if (x.id === id) l = x;
    });
    return l;
  }
  function laneRowEl(id) {
    return wrap.querySelector('rect.laneRow[data-lane="' + id + '"]');
  }
  function svgRoot() {
    return wrap.querySelector("svg");
  }
  function closeInline(doCommit, restoreFocus) {
    if (!ctx.inlineCtx) return;
    var ed = ctx.inlineCtx, v = ed.input.value;
    ctx.inlineCtx = null;
    if (ed.fo && ed.fo.parentNode) ed.fo.parentNode.removeChild(ed.fo);
    if (doCommit && v !== ed.initial) {
      try {
        ed.apply(v);
      } catch (e) {
        ctx.notify("Inline edit failed: " + e.message, true);
      }
    }
    if (restoreFocus) ctx.focusCanvas();
  }
  function openInline(el, value, apply, opts) {
    opts = opts || {};
    closeInline(false);
    var svg = svgRoot();
    if (!el || !svg) return;
    var bb;
    try {
      bb = el.getBBox();
    } catch (e) {
      return;
    }
    var fit = state.fit || 1;
    var w = Math.max(34, Math.min(opts.width || bb.width, 320));
    var h = TOUCH ? Math.min(44, Math.max(24, Math.round(36 / fit))) : 22;
    var x = Math.max(0, Math.min(bb.x, state.W - w - 2)), y = Math.max(0, Math.min(bb.y - 2, state.H - h - 2));
    var fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("class", "inline-fo");
    fo.setAttribute("x", x);
    fo.setAttribute("y", y);
    fo.setAttribute("width", w);
    fo.setAttribute("height", h);
    var inp = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
    inp.setAttribute("class", "inline-edit");
    inp.setAttribute("spellcheck", "false");
    inp.setAttribute("autocomplete", "off");
    inp.value = value === void 0 || value === null ? "" : String(value);
    inp.title = opts.title || "Enter to confirm \xB7 Esc to cancel";
    inp.placeholder = opts.placeholder || "";
    fo.appendChild(inp);
    svg.appendChild(fo);
    ctx.inlineCtx = { apply, input: inp, fo, initial: inp.value };
    inp.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        closeInline(true, true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeInline(false, true);
      }
    });
    var openedAt = Date.now();
    inp.addEventListener("blur", function() {
      var ae = document.activeElement;
      if (TOUCH && Date.now() - openedAt < 1200 && (ae === document.body || ae === wrap || ae && wrap.contains(ae))) {
        try {
          inp.focus();
        } catch (e) {
        }
        return;
      }
      closeInline(true);
    });
    try {
      inp.focus();
      inp.select();
    } catch (e) {
    }
  }
  function cellAt(e) {
    var g = e.target;
    while (g && g !== wrap) {
      if (g.getAttribute) {
        var ln = g.getAttribute("data-lane");
        if (g.classList && g.classList.contains("emptyRow")) return { empty: 1 };
        if (g.classList && g.classList.contains("edgeArc")) return { edgeIdx: +g.getAttribute("data-eidx") };
        if (g.classList && g.classList.contains("laneMeta") && g.getAttribute("data-act")) return { meta: g.getAttribute("data-act"), lane: ln };
        if (g.classList && g.classList.contains("laneMetaHit")) return { meta: g.getAttribute("data-act"), lane: ln };
        if (g.classList && (g.classList.contains("laneGroupName") || g.classList.contains("groupHit")))
          return { group: g.getAttribute("data-group") };
        if (g.classList && g.classList.contains("hnd")) return {
          hnd: g.classList.contains("hndRow") ? "row" : "col",
          lane: ln,
          col: g.getAttribute("data-col") === null ? void 0 : +g.getAttribute("data-col")
        };
        if (g.classList && g.classList.contains("colhead")) return { col: +g.getAttribute("data-c") };
        if (g.classList && (g.classList.contains("laneName") || g.classList.contains("laneHead"))) return { nameLane: ln };
        if (g.classList && g.classList.contains("cell")) return { lane: ln, tick: +g.getAttribute("data-tick") };
        if (g.classList && g.classList.contains("laneRow")) return { rowLane: ln };
      }
      g = g.parentNode;
    }
    return null;
  }
  function rowSpec(l, act) {
    switch (act) {
      // 负值合法：整行**右移** |phase| 个周期（上游同样支持）。小数随便给，0.05 起都能表达。
      case "phase":
        return {
          val: String(l.phase),
          title: "phase \u2014 shifts the lane left (negative: right) by that many periods; fractions fine",
          label: "phase",
          meta: true,
          width: 96,
          makeOp: function(v) {
            var n = Number(v);
            return v !== "" && isFinite(n) ? { t: "setPhase", lane: l.id, v: n } : null;
          }
        };
      case "period":
        return {
          val: String(l.period),
          title: "period (>=1)",
          label: "period",
          meta: true,
          width: 96,
          makeOp: function(v) {
            var n = Number(v);
            return v !== "" && isFinite(n) && n >= 1 ? { t: "setPeriod", lane: l.id, v: n } : null;
          }
        };
      case "wave":
        return {
          val: Core.laneWave(l),
          title: "row wave",
          label: "row wave",
          wide: true,
          makeOp: function(v) {
            return { t: "setWave", lane: l.id, v };
          }
        };
      case "data":
        return {
          val: Core.laneLabels(l).join(" "),
          title: "row data (space separated, empty removes)",
          label: "row data",
          wide: true,
          makeOp: function(v) {
            return { t: "setLabels", lane: l.id, v };
          }
        };
      case "node":
        return {
          val: l.node.join("").replace(/\.+$/, ""),
          title: "row node",
          label: "row node",
          wide: true,
          makeOp: function(v) {
            return { t: "setNodeStr", lane: l.id, v };
          }
        };
    }
    return null;
  }
  function openRowEditor(laneId, act) {
    var l = findLane(laneId);
    if (!l) return;
    if (l.kind === "spacer") {
      ctx.notify("Spacer rows have no editable field", true, laneRowEl(laneId));
      return;
    }
    if (act === "wave" && !rawWaveGuard(l)) return;
    var spec = rowSpec(l, act);
    if (!spec) return;
    var anchor = spec.wide ? wrap.querySelector('rect.waveZone[data-lane="' + laneId + '"]') : wrap.querySelector('tspan.laneMeta[data-act="' + act + '"][data-lane="' + laneId + '"]') || wrap.querySelector('tspan.laneMeta[data-lane="' + laneId + '"]') || wrap.querySelector('rect.laneMetaHit[data-act="' + act + '"][data-lane="' + laneId + '"]');
    if (!anchor) return;
    openInline(anchor, spec.val, function(v) {
      var op = spec.makeOp(v);
      if (!op) {
        ctx.notify("Invalid input: " + (act === "phase" ? "phase must be a number" : "period must be a number >= 1"), true, anchor);
        return;
      }
      ctx.commit(op, spec.label + " \u2192 " + v);
    }, { title: spec.title + " \xB7 Enter to confirm / Esc to cancel", placeholder: spec.title, width: spec.width });
  }
  var PHASE_DEAD = 4;
  function openPhaseEdit(laneId) {
    var l = findLane(laneId);
    if (!l || l.kind !== "signal" || !state.ir) return;
    if (state.phaseEdit && state.phaseEdit.lane === laneId) {
      closePhaseEdit(true);
      return;
    }
    if (state.phaseEdit) closePhaseEdit(true);
    state.phaseEdit = { lane: laneId, orig: l.phase, pending: null, pushed: 0, redo0: state.redo.slice() };
    if (wrap.classList) wrap.classList.add("is-phase");
    state.selLane = laneId;
    state.selCell = null;
    state.sel = null;
    if (ctx.clearSpan) ctx.clearSpan();
    ctx.redraw();
  }
  function flushPhaseStep() {
    var pe = state.phaseEdit;
    if (!pe || !pe.pending) return;
    state.undo.push(pe.pending);
    if (state.undo.length > 60) state.undo.shift();
    state.redo.length = 0;
    pe.pending = null;
    pe.pushed += 1;
  }
  function applyPhase(v) {
    var pe = state.phaseEdit;
    if (!pe) return;
    var l = findLane(pe.lane);
    if (!l || l.phase === v) return;
    if (!pe.pending) pe.pending = { ir: state.ir, src: ctx.code.value, sel: state.sel };
    ctx.commit({ t: "setPhase", lane: pe.lane, v }, "phase \u2192 " + v, true, true);
  }
  function closePhaseEdit(keep) {
    var pe = state.phaseEdit;
    if (!pe) return;
    state.phaseEdit = null;
    if (wrap.classList) wrap.classList.remove("is-phase");
    var l = findLane(pe.lane);
    if (l && l.phase !== pe.orig) {
      if (keep) flushPhaseStep();
      else {
        ctx.commit({ t: "setPhase", lane: pe.lane, v: pe.orig }, "phase", true, true);
        if (pe.pushed) state.undo.splice(Math.max(0, state.undo.length - pe.pushed), pe.pushed);
        state.redo = pe.redo0;
      }
    } else if (!keep && pe.pushed) {
      state.undo.splice(Math.max(0, state.undo.length - pe.pushed), pe.pushed);
      state.redo = pe.redo0;
    }
    ctx.redraw();
  }
  function startPhaseDrag(e) {
    var pe = state.phaseEdit, l0 = pe && findLane(pe.lane);
    if (!pe || !l0) return false;
    try {
      if (e.pointerId !== void 0 && wrap.setPointerCapture) wrap.setPointerCapture(e.pointerId);
    } catch (err) {
    }
    pe.gest0 = l0.phase;
    pe.dragX = e.clientX || 0;
    pe.armed = true;
    pe.downC = cellAt(e);
    return true;
  }
  function endPhaseTap(isTouch) {
    var pe = state.phaseEdit;
    if (!pe || !pe.armed) return false;
    var c = pe.downC;
    pe.armed = false;
    closePhaseEdit(true);
    if (c) dispatchTarget(c, { clientX: 0, clientY: 0, detail: 0, preventDefault: function() {
    } }, isTouch);
    return true;
  }
  function movePhaseDrag(e) {
    var pe = state.phaseEdit;
    if (!pe) return false;
    if (!ctx.phaseDrag && !pe.armed) return false;
    var dx = (e.clientX || 0) - pe.dragX;
    if (!ctx.phaseDrag) {
      if (Math.abs(dx) < PHASE_DEAD) return true;
      ctx.phaseDrag = true;
      pe.armed = false;
    }
    var v = pe.gest0 - dx / G.CELL;
    v = Math.round(v / PHASE_STEP) * PHASE_STEP;
    applyPhase(+Math.max(PHASE_MIN, Math.min(PHASE_MAX, v)).toFixed(2));
    return true;
  }
  function rawWaveGuard(l, el) {
    if (!l || !l.waveRaw) return true;
    ctx.notify("This row is a piece-wise path (wave: ['pw', \u2026]) \u2014 editing a cell replaces it with characters", true, el || laneRowEl(l.id));
    return false;
  }
  function handleTool(act, laneId) {
    if (act === "del") {
      state.selLane = null;
      ctx.commit({ t: "deleteLane", lane: laneId }, "delete row");
      return;
    }
    if (act === "add" || act === "spacer") {
      var at = 0;
      state.ir.lanes.forEach(function(x, i) {
        if (x.id === laneId) at = i + 1;
      });
      var id = "ln" + Date.now().toString(36);
      ctx.commit({ t: "addLane", id, name: "new", at, kind: act === "spacer" ? "spacer" : "signal" }, act === "spacer" ? "add spacer" : "add signal row");
    }
  }
  function handleColAct(act, c) {
    if (act === "insert") ctx.commit({ t: "insertTick", tick: c }, "insert cycle @ t" + c);
    else if (act === "delete") ctx.commit({ t: "deleteTick", tick: c }, "delete cycle @ t" + c);
    else if (act === "gap") ctx.commit({ t: "toggleGap", tick: c }, "toggle phase line @ t" + c);
  }
  function openEdgeEditor(i) {
    var cur = state.ir && state.ir.edges[i];
    if (cur === void 0) return;
    var sc = state.selCell;
    var anchor = wrap.querySelector('g.edgeArc[data-eidx="' + i + '"]') || (sc ? cellTarget(sc.lane, sc.tick) : null) || wrap.querySelector("rect.waveZone");
    if (!anchor) return;
    openInline(anchor, cur, function(v) {
      var t = v.trim(), arr = state.ir.edges.slice();
      if (!t) arr.splice(i, 1);
      else arr[i] = t;
      ctx.commit({ t: "setEdges", v: arr }, "edit edge -> " + (t || "remove"));
    }, { title: "edge \xB7 Enter to confirm / Esc to cancel / empty removes", placeholder: "a~>b t1", width: 170 });
  }
  function writeChar(v, dir) {
    var sc = state.selCell;
    if (!sc || !state.ir) {
      ctx.notify("Select a cell first (Tab / F6 focuses the canvas)", true);
      return;
    }
    if (!rawWaveGuard(findLane(sc.lane))) return;
    var N = state.ir.ticks;
    state.ch = v;
    var nt = dir === "left" ? Math.max(0, sc.tick - 1) : Math.min(sc.tick + 1, N - 1);
    state.selCell = { lane: sc.lane, tick: nt };
    ctx.commit({ t: "setSlot", lanes: [sc.lane], tick: sc.tick, v }, "write " + v + " @ t" + sc.tick, false, true);
    if (TOUCH && ctx.revealSel) ctx.revealSel();
  }
  function revealSel() {
    var sc = state.selCell;
    if (!sc || !state.ir || !wrap.clientWidth) return;
    var lane = null, li = -1;
    state.ir.lanes.forEach(function(l, i) {
      if (l.id === sc.lane) {
        lane = l;
        li = i;
      }
    });
    if (li < 0 || !lane) return;
    var k = state.fit || 1;
    var geo = cellGeo(lane, sc.tick), cw = geo.w * k;
    var cx = geo.cx * k, cy = (TOP2 + li * ROW_H2 + ROW_H2 / 2) * k;
    var vw = wrap.clientWidth, vh = wrap.clientHeight;
    var maxL = Math.max(0, wrap.scrollWidth - vw), maxT = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
    var left = wrap.scrollLeft, top = wrap.scrollTop;
    if (cx < left + cw * 0.6 || cx > left + vw - cw * 0.6) left = Math.min(maxL, Math.max(0, cx - vw / 2));
    if (cy < top + ROW_H2 * k * 0.6 || cy > top + vh - ROW_H2 * k * 0.6) top = Math.min(maxT, Math.max(0, cy - vh / 2));
    if (left !== wrap.scrollLeft) wrap.scrollLeft = left;
    if (top !== wrap.scrollTop) wrap.scrollTop = top;
  }
  function revealLane(laneId) {
    if (!state.ir || !wrap.clientWidth) return;
    var li = -1;
    state.ir.lanes.forEach(function(l, i) {
      if (l.id === laneId) li = i;
    });
    if (li < 0) return;
    var k = state.fit || 1;
    var cy = (TOP2 + li * ROW_H2 + ROW_H2 / 2) * k;
    var vh = wrap.clientHeight;
    if (vh < ROW_H2 * k * 2) vh = ROW_H2 * k * 2;
    var maxT = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
    var top = wrap.scrollTop;
    if (cy < top + ROW_H2 * k * 0.6 || cy > top + vh - ROW_H2 * k * 0.6) top = Math.min(maxT, Math.max(0, cy - vh / 2));
    if (top !== wrap.scrollTop) wrap.scrollTop = top;
  }
  function nodeChar(laneId, tick) {
    var l = findLane(laneId);
    return l && l.node && l.node[tick] && l.node[tick] !== "." ? l.node[tick] : "";
  }
  function handleAnchor(a) {
    var li = -1;
    state.ir.lanes.forEach(function(l, i) {
      if (l.id === a.lane) li = i;
    });
    if (li < 0 || state.ir.lanes[li].kind !== "signal") return;
    if (!state.connect) {
      state.connect = { lane: a.lane, tick: a.tick, node: a.node, li };
      ctx.redraw();
      ctx.focusCanvas();
      return;
    }
    var s = state.connect;
    if (s.lane === a.lane && s.tick === a.tick) {
      state.connect = null;
      ctx.redraw();
      ctx.notify("Start point cleared, pick a cell again");
      return;
    }
    if (!ctx.syncCode()) {
      state.connect = null;
      state.linkMode = false;
      state.linkCursor = null;
      ctx.redraw();
      return;
    }
    var used = {}, ops = [];
    state.ir.lanes.forEach(function(l) {
      (l.node || []).forEach(function(ch) {
        if (ch && ch !== ".") used[ch] = 1;
      });
    });
    function ensure(o) {
      if (o.node) return o.node;
      for (var i = 0; i < 26; i++) {
        var ch = String.fromCharCode(97 + i);
        if (!used[ch]) {
          used[ch] = 1;
          ops.push({ t: "setNode", lane: o.lane, tick: o.tick, v: ch });
          return ch;
        }
      }
      return null;
    }
    var na = ensure(s), nb = ensure(a);
    if (!na || !nb || na === nb) {
      var badAt = { lane: s.lane, tick: s.tick };
      state.connect = null;
      state.linkMode = false;
      state.linkCursor = null;
      ctx.redraw();
      ctx.notify("Link failed: not enough node letters, or both ends are the same", true, cellTarget(badAt.lane, badAt.tick));
      return;
    }
    var arr = state.ir.edges.slice(), newHead = na + "~>" + nb, found = -1, oldHead = "";
    arr.forEach(function(t, i) {
      var h = String(t).trim().split(/\s+/)[0] || "";
      if (h.charAt(0) === na && h.charAt(h.length - 1) === nb) {
        found = i;
        oldHead = h;
      }
    });
    if (found >= 0) {
      var rest = String(arr[found]).slice(oldHead.length).trim();
      arr[found] = newHead + (rest ? " " + rest : "");
    } else arr.push(newHead);
    ops.push({ t: "setEdges", v: arr });
    state.connect = null;
    state.linkMode = false;
    state.linkCursor = null;
    ctx.commit(ops, "link " + na + " -> " + nb, false, true);
  }
  function cellTarget(laneId, tick) {
    return wrap.querySelector('rect.cell[data-lane="' + laneId + '"][data-tick="' + tick + '"]');
  }
  function openCellCharEditor(laneId, tick) {
    var l = findLane(laneId);
    if (!l || l.kind === "spacer") return;
    var target = cellTarget(laneId, tick);
    if (!target) return;
    if (!rawWaveGuard(l, target)) return;
    var sl = l.slots[tick], cur = sl ? sl.w : l.slots.length ? l.slots[l.slots.length - 1].w : "x";
    openInline(target, cur, function(v) {
      var t = String(v).trim();
      if (Core.ALL.indexOf(t) < 0) {
        ctx.notify("Allowed wave characters: " + Core.ALL.join(""), true, target);
        return;
      }
      ctx.commit({ t: "setSlot", lanes: [laneId], tick, v: t }, "edit wave char -> " + t);
    }, { title: "wave character \xB7 Enter to confirm / Esc to cancel", placeholder: "1 / 0 / x / 4 / P ...", width: 126 });
  }
  function openNodeEditor(laneId, tick, curNode) {
    var l = findLane(laneId);
    if (!l || l.kind === "spacer" || tick >= l.slots.length) return;
    var target = cellTarget(laneId, tick);
    if (!target) return;
    var n = l.node[tick], cur = curNode && curNode !== "." ? curNode : n && n !== "." ? n : "";
    openInline(target, cur, function(v) {
      var t = String(v).trim().charAt(0) || ".";
      ctx.commit({ t: "setNode", lane: laneId, tick, v: t }, "edit node marker -> " + (t === "." ? "clear" : t));
    }, { title: "node marker (single char) \xB7 Enter to confirm / Esc to cancel", placeholder: "a", width: 110 });
  }
  function openLabelEditor(laneId, tick) {
    var l = findLane(laneId);
    if (!l || l.kind === "spacer") return;
    var sl = l.slots[tick];
    if (!sl || !sl.point || sl.gap || !Core.BUS.test(sl.w)) {
      ctx.notify("This cell is not a data block", true, cellTarget(laneId, tick));
      return;
    }
    var target = cellTarget(laneId, tick);
    if (!target) return;
    openInline(target, sl.label || "", function(v) {
      var t = String(v).trim();
      ctx.commit({ t: "setLabel", lane: laneId, tick, v: t }, "edit data label -> " + (t || "empty"));
    }, { title: "data label \xB7 Enter to confirm / Esc to cancel / empty removes", placeholder: "label", width: 140 });
  }
  function openInlineFor(s) {
    if (s.edgeIdx !== void 0) {
      openEdgeEditor(s.edgeIdx);
      return;
    }
    if (s.group !== void 0) {
      openGroupEditor(s.group);
      return;
    }
    if (s.nameLane) {
      var l = findLane(s.nameLane);
      if (!l || l.kind === "spacer") return;
      var el = wrap.querySelector('text.laneName[data-lane="' + s.nameLane + '"] tspan.laneNameText');
      openInline(
        el,
        l.name,
        function(v) {
          ctx.commit({ t: "rename", lane: s.nameLane, v }, "rename -> " + v);
        },
        { title: "signal name \xB7 Enter to confirm / Esc to cancel", placeholder: "name", width: 140 }
      );
      return;
    }
    if (s.lane === void 0 || s.tick === void 0) return;
    openCellCharEditor(s.lane, s.tick);
  }
  function openGroupEditor(groupPath) {
    var el, prefill, target;
    if (groupPath !== void 0 && groupPath !== null) {
      var names = wrap.querySelectorAll(".laneGroupName");
      for (var gi = 0; gi < names.length; gi++) {
        if (names[gi].getAttribute("data-group") === groupPath) {
          el = names[gi];
          break;
        }
      }
      if (!el) return;
      prefill = groupPath;
      target = { old: prefill };
    } else {
      var span = ctx.spanLanes ? ctx.spanLanes() : [];
      if (!span.length || !state.ir) return;
      el = wrap.querySelector('text.laneName[data-lane="' + span[0].id + '"]') || wrap.querySelector("svg");
      prefill = commonPath(span.map(function(l) {
        return l.groupPath;
      })).join("/");
      target = { lanes: span.map(function(l) {
        return l.id;
      }) };
    }
    openInline(el, prefill, function(v) {
      var path = groupPathOf(v);
      if (!groupPathChanged(path, target)) return;
      var op = target.old !== void 0 ? { t: "regroup", old: target.old, path } : { t: "regroup", lanes: target.lanes, path };
      var label = (target.old !== void 0 ? "regroup [" + target.old + "]" : "group " + target.lanes.length + " row(s)") + " -> " + (path.join("/") || "(none)");
      ctx.commit(op, label);
    }, {
      title: "group path \u2014 one segment per level (a/b), empty = no group; type or edit the path directly",
      placeholder: "group",
      width: 180
    });
  }
  function groupPathChanged(path, target) {
    var key = path.join("/");
    if (target.old !== void 0) return key !== target.old;
    var changed = false;
    state.ir.lanes.forEach(function(l) {
      if (target.lanes.indexOf(l.id) >= 0 && l.groupPath.join("/") !== key) changed = true;
    });
    return changed;
  }
  function groupPathOf(raw) {
    return String(raw === void 0 || raw === null ? "" : raw).split("/").map(function(p) {
      return p.trim();
    }).filter(function(p) {
      return p.length;
    });
  }
  function commonPath(paths) {
    if (!paths.length) return [];
    var out = paths[0].slice();
    paths.forEach(function(p) {
      var n = 0;
      while (n < out.length && n < p.length && out[n] === p[n]) n++;
      out = out.slice(0, n);
    });
    return out;
  }
  function openEditorFor(c) {
    if (!c) return;
    if (state.phaseEdit) closePhaseEdit(true);
    var snap = { lane: c.lane, tick: c.tick, nameLane: c.nameLane, edgeIdx: c.edgeIdx, group: c.group };
    if (!(snap.nameLane || snap.edgeIdx !== void 0 || snap.group !== void 0 || snap.lane !== void 0 && snap.tick !== void 0)) return;
    ctx.painting = null;
    state.connect = null;
    ctx.redraw();
    openInlineFor(snap);
  }
  var lastTap = null, longPress = null, longTimer = null, ignoreMouseUntil = 0;
  function hitKey(c) {
    if (!c) return "";
    if (c.edgeIdx !== void 0) return "e" + c.edgeIdx;
    if (c.nameLane) return "n" + c.nameLane;
    if (c.group !== void 0) return "g" + c.group;
    if (c.lane !== void 0 && c.tick !== void 0) return "c" + c.lane + "@" + c.tick;
    return JSON.stringify(c);
  }
  function touchDetail(c) {
    var now = Date.now(), key = hitKey(c);
    if (lastTap && lastTap.key === key && now - lastTap.time < 330) {
      lastTap = null;
      return 2;
    }
    lastTap = { key, time: now };
    return 1;
  }
  function clearLong() {
    if (longTimer) {
      clearTimeout(longTimer);
      longTimer = null;
    }
    longPress = null;
  }
  function editable(c) {
    if (!c) return false;
    if (c.edgeIdx !== void 0 || c.nameLane || c.group !== void 0) return true;
    return c.lane !== void 0 && c.tick !== void 0 && c.meta === void 0 && c.col === void 0 && c.rowLane === void 0;
  }
  function startLong(c, x, y) {
    clearLong();
    if (!editable(c)) return;
    longPress = { x, y, c };
    longTimer = setTimeout(function() {
      longTimer = null;
      var p = longPress;
      longPress = null;
      if (!p) return;
      lastTap = null;
      press = null;
      openEditorFor(p.c);
    }, 480);
  }
  var handDrag = null;
  function laneIndexById(id) {
    var k = -1;
    state.ir.lanes.forEach(function(l, i) {
      if (l.id === id) k = i;
    });
    return k;
  }
  function handTarget(e) {
    if (!handDrag) return null;
    if (handDrag.kind === "row") {
      var rows = [].slice.call(wrap.querySelectorAll("g.laneGrp > rect.laneRow"));
      if (!rows.length) return null;
      var best = 0, bd = 1e9;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - e.clientY);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return best;
    }
    var hs = [].slice.call(wrap.querySelectorAll("g.colhead[data-c]"));
    var bt = null, bdx = 1e9;
    for (var j = 0; j < hs.length; j++) {
      if (hs[j].classList.contains("ghost")) continue;
      var b = hs[j].getBoundingClientRect();
      var dx = Math.abs(b.left + b.width / 2 - e.clientX);
      if (dx < bdx) {
        bdx = dx;
        bt = +hs[j].getAttribute("data-c");
      }
    }
    return bt;
  }
  function showHandLine() {
    var svg = svgRoot();
    if (!svg || !handDrag || handDrag.to === null) return;
    if (!handDrag.line) {
      var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("class", "dropLine");
      svg.appendChild(ln);
      handDrag.line = ln;
    }
    var ln = handDrag.line, t = handDrag.to;
    if (handDrag.kind === "row") {
      var rows = [].slice.call(wrap.querySelectorAll("g.laneGrp > rect.laneRow"));
      if (!rows[t]) return;
      var r = rows[t].getBoundingClientRect();
      var y = r.top + (t > handDrag.from ? r.height : 0);
      var a = svgXY(r.left, y), b = svgXY(r.right, y);
      ln.setAttribute("x1", a.x.toFixed(1));
      ln.setAttribute("y1", a.y.toFixed(1));
      ln.setAttribute("x2", b.x.toFixed(1));
      ln.setAttribute("y2", b.y.toFixed(1));
    } else {
      var hs = [].slice.call(wrap.querySelectorAll("g.colhead[data-c]"));
      var el = null;
      for (var i = 0; i < hs.length; i++) {
        if (+hs[i].getAttribute("data-c") === t) {
          el = hs[i];
          break;
        }
      }
      if (!el) return;
      var q = el.getBoundingClientRect();
      var x = q.left + (t > handDrag.from ? q.width : 0);
      var c1 = svgXY(x, q.top), c2 = svgXY(x, q.bottom);
      ln.setAttribute("x1", c1.x.toFixed(1));
      ln.setAttribute("y1", (c1.y + 30).toFixed(1));
      ln.setAttribute("x2", c2.x.toFixed(1));
      ln.setAttribute("y2", (c2.y - 4).toFixed(1));
    }
  }
  function startHandDrag(c, e) {
    var from = c.hnd === "row" ? laneIndexById(c.lane) : c.col;
    if (from === null || from === void 0 || from < 0) return;
    handDrag = { kind: c.hnd, lane: c.lane, from, to: from, line: null, moved: false };
    if (c.hnd === "row") {
      state.selLane = c.lane;
      state.selCell = null;
      state.sel = null;
    } else {
      state.sel = from;
      state.selCell = null;
      state.selLane = null;
    }
    if (ctx.clearSpan) ctx.clearSpan();
    ctx.redraw();
  }
  function moveHandDrag(e) {
    if (!handDrag) return;
    var t = handTarget(e);
    if (t !== null && t !== handDrag.to) {
      handDrag.to = t;
    }
    if (t !== null && t !== handDrag.from) handDrag.moved = true;
    showHandLine();
  }
  function endHandDrag() {
    var d = handDrag;
    handDrag = null;
    if (d.line && d.line.parentNode) d.line.parentNode.removeChild(d.line);
    if (!d.moved || d.from === d.to) {
      ctx.redraw();
      return;
    }
    if (d.kind === "row") ctx.commit({ t: "moveLane", lane: d.lane, to: d.to }, "move row");
    else ctx.commit({ t: "moveTick", from: d.from, to: d.to }, "move column");
  }
  var press = null;
  function handleDown(e, isTouch) {
    if (e.button !== void 0 && e.button !== 0) return;
    if (e.target && e.target.getAttribute && e.target.getAttribute("class") === "inline-edit") return;
    if (state.phaseEdit) {
      var pc = cellAt(e);
      if (pc && pc.lane === state.phaseEdit.lane && pc.tick !== void 0) {
        e.preventDefault && e.preventDefault();
        startPhaseDrag(e);
        return;
      }
    }
    if (isTouch) {
      press = { x: e.clientX || 0, y: e.clientY || 0, c: cellAt(e), t: Date.now() };
      if (!state.readonly) startLong(press.c, press.x, press.y);
      return;
    }
    if (state.readonly) return;
    var hc0 = cellAt(e);
    if (hc0 && hc0.hnd) {
      e.preventDefault && e.preventDefault();
      startHandDrag(hc0, e);
      return;
    }
    dispatchTarget(hc0, e, false);
  }
  function dispatchTarget(c, e, isTouch) {
    var dbl = isTouch ? touchDetail(c) : e.detail > 1 ? 2 : 1;
    if (ctx.inlineCtx) closeInline(true);
    if (state.phaseEdit) closePhaseEdit(true);
    if (c && c.hnd) {
      e.preventDefault && e.preventDefault();
      if (c.hnd === "row") {
        state.selLane = c.lane;
        state.selCell = null;
        state.sel = null;
      } else {
        state.sel = c.col;
        state.selCell = null;
        state.selLane = null;
      }
      if (ctx.clearSpan) ctx.clearSpan();
      ctx.redraw();
      return;
    }
    if (!c) {
      if (state.selCell || state.selLane || state.selRows || state.sel !== null && state.sel !== void 0) {
        state.selCell = null;
        state.sel = null;
        state.selLane = null;
        if (ctx.clearSpan) ctx.clearSpan();
        ctx.redraw();
      }
      return;
    }
    if (c.empty) {
      if (dbl > 1) return;
      e.preventDefault();
      ctx.commit({ t: "addLane", id: "ln" + Date.now().toString(36), name: "new", at: 0, kind: "signal" }, "add signal row");
      return;
    }
    if (c.cmd) {
      if (dbl > 1) return;
      e.preventDefault();
      ctx.doCmd(c.cmd);
      return;
    }
    if (state.linkMode) {
      if (dbl > 1) {
        e.preventDefault();
        return;
      }
      if (c.lane !== void 0 && c.tick !== void 0) {
        e.preventDefault();
        var el = findLane(c.lane);
        if (!el || el.kind !== "signal" || !el.slots[c.tick]) {
          ctx.notify("That period is not defined in the source yet", true, cellTarget(c.lane, c.tick));
          return;
        }
        state.linkCursor = { lane: c.lane, tick: c.tick };
        handleAnchor({ lane: c.lane, tick: c.tick, node: nodeChar(c.lane, c.tick) });
      }
      return;
    }
    if (c.meta) {
      if (dbl > 1) return;
      e.preventDefault();
      openRowEditor(c.lane, c.meta);
      return;
    }
    if (c.group !== void 0) {
      if (dbl > 1) return;
      e.preventDefault();
      openGroupEditor(c.group);
      return;
    }
    if (c.col !== void 0) {
      if (dbl > 1) return;
      e.preventDefault();
      state.sel = c.col;
      state.selCell = null;
      state.selLane = null;
      if (ctx.clearSpan) ctx.clearSpan();
      ctx.redraw();
      ctx.status();
      return;
    }
    if (c.nameLane || c.rowLane) {
      var rowId = c.nameLane || c.rowLane;
      if (e.shiftKey && state.selLane && state.selLane !== rowId && ctx.setRowSpan) {
        ctx.setRowSpan(state.selLane, rowId, state.selLane);
        state.selCell = null;
        state.sel = null;
        ctx.redraw();
        return;
      }
      state.selLane = rowId;
      if (ctx.clearSpan) ctx.clearSpan();
      state.selCell = null;
      state.sel = null;
      if (dbl > 1) {
        e.preventDefault();
        if (editable(c)) openEditorFor(c);
        return;
      }
      ctx.redraw();
      return;
    }
    if (dbl > 1) {
      e.preventDefault();
      if (!editable(c)) return;
      openEditorFor(c);
      return;
    }
    if (c.edgeIdx !== void 0) {
      if (dbl > 1) {
        e.preventDefault();
        openEditorFor(c);
        return;
      }
      e.preventDefault();
      state.selLane = null;
      ctx.redraw();
      return;
    }
    e.preventDefault();
    if (isTouch) {
      state.selCell = { lane: c.lane, tick: c.tick };
      state.selLane = c.lane;
      state.sel = null;
      ctx.painting = null;
      ctx.redraw();
      return;
    }
    state.selCell = { lane: c.lane, tick: c.tick };
    state.selLane = c.lane;
    var pl = findLane(c.lane);
    ctx.painting = pl && pl.waveRaw ? null : { lane: c.lane, ticks: [], v: state.ch, base: { ir: state.ir, src: code.value, sel: state.sel }, moved: false };
    ctx.focusCanvas();
    ctx.redraw();
  }
  function svgXY(cx, cy) {
    var svg = svgRoot();
    if (!svg) return { x: cx, y: cy };
    var r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    var kx = vb && r.width ? vb.width / r.width : 1, ky = vb && r.height ? vb.height / r.height : 1;
    return { x: (cx - r.left) * kx + (vb ? vb.x : 0), y: (cy - r.top) * ky + (vb ? vb.y : 0) };
  }
  function showConnectPreview(mx, my) {
    var svg = svgRoot();
    if (!svg || !state.connect) return;
    var p = svg.querySelector("path.connectPreview");
    if (!p) {
      p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("class", "connectPreview");
      svg.appendChild(p);
    }
    var a = state.connect, ln = findLane(a.lane);
    var ax = ln ? cellGeo(ln, a.tick).cx : G.XS + a.tick * G.CELL + G.CELL / 2, ay = TOP2 + a.li * ROW_H2 + 7;
    p.setAttribute("d", "M" + ax + "," + ay + " C" + (ax + 10) + "," + (ay - 26) + " " + (mx - 10) + "," + (my - 26) + " " + mx + "," + my);
  }
  function syntheticMouse(e) {
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return true;
    return Date.now() < ignoreMouseUntil;
  }
  wrap.addEventListener("mousedown", function(e) {
    if (syntheticMouse(e)) return;
    handleDown(e, false);
  });
  wrap.addEventListener("mousemove", function(e) {
    if (handDrag) {
      e.preventDefault && e.preventDefault();
      moveHandDrag(e);
      return;
    }
    if (movePhaseDrag(e)) return;
    var svg = svgRoot();
    if (state.connect && svg) {
      var q = svgXY(e.clientX, e.clientY);
      showConnectPreview(q.x, q.y);
    }
    var hc = cellAt(e);
    if (!ctx.painting || !e.buttons) return;
    var c = hc;
    if (!c || c.lane === void 0 || c.tick === void 0 || c.lane !== ctx.painting.lane || ctx.painting.ticks.indexOf(c.tick) >= 0) return;
    ctx.painting.ticks.push(c.tick);
    ctx.painting.moved = true;
    state.ch = ctx.painting.v;
    state.selCell = { lane: c.lane, tick: c.tick };
    ctx.commit({ t: "setSlot", lanes: [c.lane], tick: c.tick, v: ctx.painting.v }, "paint @ t" + c.tick, true, true);
  });
  wrap.addEventListener("wheel", function(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    var k = Math.exp(-(e.deltaY * unit) * 18e-4);
    if (ctx.setZoom) ctx.setZoom((state.zoom || 1) * k, e.clientX, e.clientY);
  }, { passive: false });
  ctx.on(document, "mousedown", function(e) {
    if (!state.phaseEdit) return;
    var t = e.target;
    if (t && wrap.contains && wrap.contains(t)) return;
    closePhaseEdit(true);
  }, true);
  ctx.on(document, "pointerdown", function(e) {
    if (!state.phaseEdit || e.pointerType === "mouse") return;
    var t = e.target;
    if (t && wrap.contains && wrap.contains(t)) return;
    closePhaseEdit(true);
  }, true);
  ctx.on(document, "mouseup", function(e) {
    if (e && syntheticMouse(e)) return;
    if (handDrag) {
      endHandDrag();
      return;
    }
    if (ctx.phaseDrag) {
      ctx.phaseDrag = false;
      flushPhaseStep();
      return;
    }
    if (endPhaseTap(false)) return;
    if (!ctx.painting) return;
    var p = ctx.painting;
    ctx.painting = null;
    if (p.moved) {
      state.undo.push(p.base);
      if (state.undo.length > 60) state.undo.shift();
      state.redo.length = 0;
    }
  });
  function pointerShim(e) {
    return {
      target: e.target,
      button: 0,
      detail: 0,
      clientX: e.clientX || 0,
      clientY: e.clientY || 0,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      isPrimary: e.isPrimary,
      preventDefault: function() {
      }
    };
  }
  var tPts = {}, tPan = null, tDown = null, tActive = false, tLast = 0;
  var T_STALE = 2500;
  var T_GAP = 1200;
  var T_HOLD = 600;
  var ZMIN_D = 24;
  var tPinch = null;
  var tMulti = false;
  var tZoomed = false;
  function tPinchStart() {
    var ks = Object.keys(tPts);
    if (ks.length < 2) return false;
    var a = tPts[ks[0]], b = tPts[ks[1]];
    var c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    var an = svgXY(c.x, c.y);
    var dx = a.x - b.x, dy = a.y - b.y;
    tPinch = { d0: Math.sqrt(dx * dx + dy * dy), z0: state.zoom || 1, ax: an.x, ay: an.y };
    return true;
  }
  function tPinchMove() {
    if (!tPinch) return false;
    var ks = Object.keys(tPts);
    if (ks.length < 2) return false;
    var a = tPts[ks[0]], b = tPts[ks[1]];
    var c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (tPinch.d0 >= ZMIN_D) {
      var dx = a.x - b.x, dy = a.y - b.y;
      var z = clampZoom(tPinch.z0 * Math.sqrt(dx * dx + dy * dy) / tPinch.d0, state.zoomMin);
      if (Math.abs(z - (state.zoom || 1)) > 2e-3) {
        state.zoom = z;
        tZoomed = true;
        if (ctx.applyZoom && !ctx.applyZoom()) {
          state.zoom = tPinch.z0;
        }
      }
    }
    if (ctx.anchorScroll) ctx.anchorScroll(tPinch.ax, tPinch.ay, c.x, c.y);
    return true;
  }
  function tStartMulti() {
    tMulti = true;
    press = null;
    clearLong();
    var svg = svgRoot(), pv = svg && svg.querySelector("path.connectPreview");
    if (pv && pv.parentNode) pv.parentNode.removeChild(pv);
    tHandOffToPan();
    tPinchStart();
  }
  function tEndMulti() {
    if (tCount()) return;
    tMulti = false;
    if (tZoomed) {
      tZoomed = false;
      ctx.redraw();
    }
  }
  function tid(e) {
    return e.pointerId === void 0 ? 0 : e.pointerId;
  }
  function tPrune() {
    var now = Date.now(), ks = Object.keys(tPts), i;
    for (i = 0; i < ks.length; i++) if (now - tPts[ks[i]].t > T_STALE) delete tPts[ks[i]];
  }
  function tCount() {
    tPrune();
    return Object.keys(tPts).length;
  }
  function tReset() {
    tPts = {};
    tPan = null;
    tDown = null;
    tActive = false;
    tLast = 0;
    tPinch = null;
    tMulti = false;
    tZoomed = false;
  }
  function tCentroid() {
    var ks = Object.keys(tPts);
    if (!ks.length) return null;
    var sx = 0, sy = 0, i;
    for (i = 0; i < ks.length; i++) {
      sx += tPts[ks[i]].x;
      sy += tPts[ks[i]].y;
    }
    return { x: sx / ks.length, y: sy / ks.length };
  }
  function tPanStart() {
    var c = tCentroid();
    if (!c) return;
    tPan = { x: c.x, y: c.y, left: wrap.scrollLeft, top: wrap.scrollTop };
  }
  function tPanMove() {
    if (!tPan) return false;
    var c = tCentroid();
    if (!c) return false;
    wrap.scrollLeft = tPan.left - (c.x - tPan.x);
    wrap.scrollTop = tPan.top - (c.y - tPan.y);
    return true;
  }
  function tDropPoint(id) {
    delete tPts[id];
    if (!tCount()) {
      tPan = null;
      tDown = null;
      tActive = false;
    }
  }
  function tHandOffToPan() {
    var pe = state.phaseEdit, l = pe && findLane(pe.lane);
    if (pe && l && pe.pending && l.phase !== pe.orig) {
      var keep = { sel: state.sel, selCell: state.selCell, selLane: state.selLane };
      ctx.code.value = pe.pending.src;
      ctx.fromCode(pe.pending.src);
      state.sel = keep.sel;
      state.selCell = keep.selCell;
      state.selLane = keep.selLane;
      pe.pending = null;
      ctx.redraw();
    }
    ctx.phaseDrag = false;
    tPanStart();
  }
  wrap.addEventListener("pointerdown", function(e) {
    if (e.pointerType === "mouse") return;
    if (e.target && e.target.getAttribute && e.target.getAttribute("class") === "inline-edit") return;
    if (e.isTrusted) ignoreMouseUntil = Date.now() + 800;
    var id = tid(e), cx = e.clientX || 0, cy = e.clientY || 0, now = Date.now();
    if (!tActive || now - tLast > T_GAP) tReset();
    tActive = true;
    tLast = now;
    Object.keys(tPts).forEach(function(k) {
      if (now - tPts[k].t > T_HOLD) delete tPts[k];
    });
    tPts[id] = { x: cx, y: cy, t: now };
    if (tCount() === 1) {
      tDown = { x: cx, y: cy };
      tPan = null;
      tPinch = null;
      tMulti = false;
      tZoomed = false;
    }
    if (e.isPrimary === false && tCount() > 1) {
      tStartMulti();
      return;
    }
    handleDown(pointerShim(e), true);
  });
  ctx.on(document, "pointermove", function(e) {
    if (e.pointerType === "mouse" || !tActive) return;
    var id = tid(e), cx = e.clientX || 0, cy = e.clientY || 0;
    if (tPts[id]) {
      tPts[id].x = cx;
      tPts[id].y = cy;
      tPts[id].t = Date.now();
      tLast = tPts[id].t;
    } else if (!(tPan || ctx.phaseDrag)) return;
    if (tPinch && tCount() >= 2 && tPinchMove()) return;
    if (tPan) {
      tPanMove();
      return;
    }
    if (ctx.phaseDrag || state.phaseEdit && state.phaseEdit.armed) {
      if (tDown && Math.abs(cy - tDown.y) > 14 && Math.abs(cy - tDown.y) > Math.abs(cx - tDown.x) * 1.5) {
        if (state.phaseEdit) state.phaseEdit.armed = false;
        tHandOffToPan();
        tPanMove();
        return;
      }
      movePhaseDrag(e);
      return;
    }
    if (press && (Math.abs(cx - press.x) > 12 || Math.abs(cy - press.y) > 12)) {
      press = null;
      clearLong();
      if (state.phaseEdit) {
        closePhaseEdit(true);
        tPanStart();
        tPanMove();
        return;
      }
    }
    if (longPress && (Math.abs(cx - longPress.x) > 12 || Math.abs(cy - longPress.y) > 12)) clearLong();
    if (state.connect) {
      var svg = svgRoot();
      if (svg) {
        var q2 = svgXY(cx, cy);
        showConnectPreview(q2.x, q2.y);
      }
    }
  }, true);
  function confirmTap(cx, cy) {
    var p = press;
    press = null;
    clearLong();
    if (!p) return;
    var x = cx, y = cy;
    if (!x && !y) {
      x = p.x;
      y = p.y;
    }
    if (Math.abs(x - p.x) > 12 || Math.abs(y - p.y) > 12) return;
    if (Date.now() - p.t > 500) return;
    if (state.readonly) return;
    dispatchTarget(p.c, { clientX: p.x, clientY: p.y, detail: 0, preventDefault: function() {
    } }, true);
  }
  function endPointer(e) {
    if (e.pointerType === "mouse") return;
    tLast = Date.now();
    if (!tActive) return;
    tDropPoint(tid(e));
    if (tPinch && tCount() < 2) tPinch = null;
    if (ctx.phaseDrag) {
      ctx.phaseDrag = false;
      flushPhaseStep();
      return;
    }
    if (tMulti) {
      tEndMulti();
      return;
    }
    if (endPhaseTap(true)) return;
    confirmTap(e.clientX || 0, e.clientY || 0);
  }
  ctx.on(document, "pointerup", endPointer, true);
  ctx.on(document, "pointercancel", function(e) {
    if (e.pointerType === "mouse") return;
    clearLong();
    press = null;
    if (!tActive) return;
    tDropPoint(tid(e));
    if (ctx.phaseDrag) {
      ctx.phaseDrag = false;
      flushPhaseStep();
    }
    if (tPinch && tCount() < 2) tPinch = null;
    if (tMulti) tEndMulti();
  }, true);
  function tSettle() {
    if (tZoomed) {
      tZoomed = false;
      ctx.redraw();
    }
    tReset();
  }
  wrap.addEventListener("lostpointercapture", function() {
    if (!ctx.phaseDrag) tSettle();
  });
  ctx.on(window, "blur", function() {
    clearLong();
    press = null;
    if (ctx.phaseDrag) {
      ctx.phaseDrag = false;
      flushPhaseStep();
    }
    tSettle();
  });
  ctx.on(document, "visibilitychange", function() {
    if (!document.hidden) return;
    clearLong();
    press = null;
    if (ctx.phaseDrag) {
      ctx.phaseDrag = false;
      flushPhaseStep();
    }
    tSettle();
  });
  if (typeof window !== "undefined" && !window.PointerEvent) {
    let touchShim = function(e) {
      var t = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0];
      if (!t) return null;
      var target = document.elementFromPoint(t.clientX, t.clientY) || e.target;
      return {
        target,
        button: 0,
        detail: 0,
        clientX: t.clientX,
        clientY: t.clientY,
        preventDefault: function() {
        }
      };
    };
    wrap.addEventListener("touchstart", function(e) {
      if (e.touches && e.touches.length > 1) {
        press = null;
        clearLong();
        return;
      }
      var s = touchShim(e);
      if (!s) return;
      if (e.isTrusted) ignoreMouseUntil = Date.now() + 800;
      handleDown(s, true);
    }, { passive: true });
    wrap.addEventListener("touchmove", function(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      if (press && (Math.abs(t.clientX - press.x) > 12 || Math.abs(t.clientY - press.y) > 12)) {
        press = null;
        clearLong();
      }
      if (longPress && (Math.abs(t.clientX - longPress.x) > 12 || Math.abs(t.clientY - longPress.y) > 12)) clearLong();
      if (state.connect) {
        var svg = svgRoot();
        if (svg) {
          var q3 = svgXY(t.clientX, t.clientY);
          showConnectPreview(q3.x, q3.y);
        }
      }
    }, { passive: true });
    ctx.on(document, "touchend", function(e) {
      if (e.touches && e.touches.length) return;
      var t = e.changedTouches && e.changedTouches[0];
      confirmTap(t ? t.clientX : 0, t ? t.clientY : 0);
    }, { passive: true });
    ctx.on(document, "touchcancel", function() {
      clearLong();
      press = null;
    }, { passive: true });
  }
  var NAV = /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End)$/;
  function prevent(e) {
    if (e.preventDefault) e.preventDefault();
  }
  function otherControl() {
    var ae = document.activeElement;
    return !!(ae && ae !== document.body && ae !== wrap && !wrap.contains(ae) && /^(BUTTON|A|SELECT|TEXTAREA|INPUT)$/.test(ae.tagName || ""));
  }
  function sigIndex(from, dir) {
    var ls = state.ir.lanes, i = from;
    for (var n = 0; n < ls.length; n++) {
      i += dir;
      if (i < 0 || i >= ls.length) return from;
      if (ls[i].kind === "signal") return i;
    }
    return from;
  }
  function firstSig() {
    var ls = state.ir.lanes;
    for (var i = 0; i < ls.length; i++) if (ls[i].kind === "signal") return i;
    return -1;
  }
  function lastSig() {
    var ls = state.ir.lanes;
    for (var i = ls.length - 1; i >= 0; i--) if (ls[i].kind === "signal") return i;
    return -1;
  }
  function ensureSel() {
    if (!state.ir || state.linkMode) return null;
    if (!state.selCell) ctx.ensureSelCell();
    return ctx.clampSel();
  }
  function moveSel(k, e) {
    var sc = ensureSel();
    if (!sc) return;
    var N = state.ir.ticks, ls = state.ir.lanes, li = -1;
    ls.forEach(function(l, i) {
      if (l.id === sc.lane) li = i;
    });
    var nt = sc.tick, ni = li;
    if (k === "ArrowLeft") nt = Math.max(0, sc.tick - 1);
    else if (k === "ArrowRight") nt = Math.min(N - 1, sc.tick + 1);
    else if (k === "Home") nt = 0;
    else if (k === "End") nt = N - 1;
    else ni = sigIndex(li, k === "ArrowUp" ? -1 : 1);
    if (e.ctrlKey || e.metaKey) {
      if (k === "Home") ni = firstSig();
      if (k === "End") ni = lastSig();
    }
    if (ni < 0) ni = li;
    state.selCell = { lane: (ls[ni] || ls[li]).id, tick: nt };
    state.selLane = state.selCell.lane;
    ctx.redraw();
  }
  function moveLaneByKeyboard(dir) {
    var sc = ensureSel();
    if (!sc) return;
    ctx.commit({ t: "moveLane", lane: sc.lane, v: dir }, dir === "up" ? "move row up" : "move row down");
    ctx.clampSel();
    ctx.redraw();
  }
  function editEdge(next) {
    var n = state.ir.edges.length;
    if (!n) {
      ctx.notify("No edges yet \u2014 press K to create one", true);
      return;
    }
    if (next) state.edgeIdx = ((state.edgeIdx || 0) + 1) % n;
    if (state.edgeIdx >= n) state.edgeIdx = 0;
    ctx.openEdgeEditor(state.edgeIdx);
  }
  function command(k, e, sc) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    var lane = findLane(sc.lane);
    function needSignal() {
      if (!lane || lane.kind === "spacer") {
        ctx.notify("This is a spacer row \u2014 move to a signal row first", true, laneRowEl(sc.lane));
        return false;
      }
      return true;
    }
    switch (k) {
      case "k":
        ctx.setLinkMode(true);
        return true;
      // 连线模式开关
      case "r":
        if (needSignal()) ctx.openInlineFor({ nameLane: sc.lane });
        return true;
      case "w":
      case "a":
      case "s":
      case "f":
      case "t":
        if (needSignal()) ctx.openRowEditor(sc.lane, { w: "wave", a: "data", s: "node", f: "phase", t: "period" }[k]);
        return true;
      case "b":
        if (needSignal()) ctx.openLabelEditor(sc.lane, sc.tick);
        return true;
      case "e":
      case "E":
        editEdge(k === "E");
        return true;
      // 编辑 / 切换弧线
      case "o":
      case "O":
      case "X":
        ctx.handleTool(k === "o" ? "add" : k === "O" ? "spacer" : "del", sc.lane);
        ctx.clampSel();
        ctx.redraw();
        return true;
      case "+":
      case "-":
      case "g":
      case "A":
        ctx.handleColAct(
          k === "+" || k === "A" ? "insert" : k === "-" ? "delete" : "gap",
          k === "A" ? state.ir.ticks : sc.tick
        );
        ctx.clampSel();
        ctx.redraw();
        return true;
    }
    return false;
  }
  function linkKeys(e) {
    var k = e.key;
    if (k === "Escape" || k === "k" || k === "K") {
      prevent(e);
      ctx.setLinkMode(false);
      return;
    }
    var lc = state.linkCursor;
    if (k === "Enter" || k === " " || k === "Spacebar") {
      prevent(e);
      if (!lc) {
        ctx.notify("No signal rows available as link endpoints", true);
        return;
      }
      var l = findLane(lc.lane);
      if (!l || l.kind !== "signal" || !l.slots[lc.tick]) {
        ctx.notify("That period is not defined in the source yet", true, cellTarget(lc.lane, lc.tick));
        return;
      }
      handleAnchor({ lane: lc.lane, tick: lc.tick, node: nodeChar(lc.lane, lc.tick) });
      return;
    }
    if (NAV.test(k)) {
      prevent(e);
      if (lc && state.ir) {
        var N = state.ir.ticks, ls = state.ir.lanes, li = -1;
        ls.forEach(function(l2, i) {
          if (l2.id === lc.lane) li = i;
        });
        var nt = lc.tick, ni = li;
        if (k === "ArrowLeft") nt = Math.max(0, lc.tick - 1);
        else if (k === "ArrowRight") nt = Math.min(N - 1, lc.tick + 1);
        else if (k === "Home") nt = 0;
        else if (k === "End") nt = N - 1;
        else ni = sigIndex(li, k === "ArrowUp" ? -1 : 1);
        if (ni < 0) ni = li;
        state.linkCursor = { lane: (ls[ni] || ls[li]).id, tick: nt };
        ctx.redraw();
      }
      return;
    }
  }
  ctx.on(document, "keydown", function(e) {
    var t = e.target || {}, typing = /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName || "") || t.isContentEditable;
    if (e.key === "F6") {
      prevent(e);
      var ae = document.activeElement;
      ctx.focusPane(ae === code ? "diagram" : ae === wrap || wrap.contains(ae) ? "src" : "diagram");
      return;
    }
    if (e.key === "Escape" && state.linkMode) {
      ctx.setLinkMode(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && /^(z|y)$/i.test(e.key) && !typing) {
      prevent(e);
      if (state.phaseEdit) closePhaseEdit(true);
      ctx.doCmd(e.shiftKey || /^y$/i.test(e.key) ? "redo" : "undo");
      return;
    }
    if (state.phaseEdit && !typing) {
      var pk = e.key;
      if (pk === "Escape") {
        prevent(e);
        e.stopPropagation();
        closePhaseEdit(false);
        return;
      }
      if (pk === "Enter" || pk === " " || pk === "Spacebar") {
        prevent(e);
        closePhaseEdit(true);
        return;
      }
      if (pk === "ArrowLeft" || pk === "ArrowRight") {
        prevent(e);
        var pl = findLane(state.phaseEdit.lane);
        var step = (pk === "ArrowLeft" ? 1 : -1) * (e.shiftKey ? 0.5 : PHASE_STEP);
        if (pl) applyPhase(+Math.max(PHASE_MIN, pl.phase + step).toFixed(2));
        return;
      }
      if (pk === "0") {
        prevent(e);
        applyPhase(0);
        return;
      }
    }
    if (typing || otherControl()) return;
    if (state.readonly) return;
    if (state.linkMode) {
      linkKeys(e);
      return;
    }
    var k = e.key;
    if (k === "Escape" && (state.selCell || state.selLane || state.selRows || state.sel !== null && state.sel !== void 0)) {
      prevent(e);
      e.stopPropagation();
      state.selCell = null;
      state.selLane = null;
      state.sel = null;
      if (ctx.clearSpan) ctx.clearSpan();
      if (ctx.closeCharDock) ctx.closeCharDock();
      ctx.redraw();
      return;
    }
    if (e.shiftKey && (k === "ArrowUp" || k === "ArrowDown") && ctx.extendSpan) {
      if (!state.selLane) {
        var f0 = ensureSel();
        if (f0) state.selLane = f0.lane;
      }
      ctx.extendSpan(k === "ArrowUp" ? -1 : 1);
      return;
    }
    var sc = ensureSel();
    if (!sc || !state.ir) return;
    var ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl && !e.altKey && Core.ALL.indexOf(k) >= 0) {
      prevent(e);
      writeChar(k);
      return;
    }
    if (k === "Enter" && e.shiftKey) {
      prevent(e);
      var nl = findLane(sc.lane);
      ctx.openNodeEditor(sc.lane, sc.tick, nl ? nl.node[sc.tick] : "");
      return;
    }
    if (k === "Enter") {
      prevent(e);
      ctx.openInlineFor({ lane: sc.lane, tick: sc.tick });
      return;
    }
    if (ctrl && (k === "ArrowUp" || k === "ArrowDown")) {
      prevent(e);
      moveLaneByKeyboard(k === "ArrowUp" ? "up" : "down");
      return;
    }
    if (NAV.test(k)) {
      prevent(e);
      if (e.shiftKey && (k === "ArrowLeft" || k === "ArrowRight")) {
        writeChar(state.ch || "1", k === "ArrowLeft" ? "left" : "right");
        return;
      }
      moveSel(k, e);
      return;
    }
    if (command(k, e, sc)) prevent(e);
  });
  ctx.svgRoot = svgRoot;
  ctx.findLane = findLane;
  ctx.closeInline = closeInline;
  ctx.openInline = openInline;
  ctx.openRowEditor = openRowEditor;
  ctx.openCellCharEditor = openCellCharEditor;
  ctx.writeChar = writeChar;
  ctx.revealSel = revealSel;
  ctx.revealLane = revealLane;
  ctx.openLabelEditor = openLabelEditor;
  ctx.openNodeEditor = openNodeEditor;
  ctx.openEdgeEditor = openEdgeEditor;
  ctx.openInlineFor = openInlineFor;
  ctx.openGroupEditor = openGroupEditor;
  ctx.openPhaseEdit = openPhaseEdit;
  ctx.closePhaseEdit = closePhaseEdit;
  ctx.openEditorFor = openEditorFor;
  ctx.handleTool = handleTool;
  ctx.handleColAct = handleColAct;
  ctx.cancelModes = function() {
    state.connect = null;
    state.linkMode = false;
    state.linkCursor = null;
    state.selCell = null;
    state.sel = null;
    state.selLane = null;
    if (ctx.clearSpan) ctx.clearSpan();
    ctx.painting = null;
    ctx.closeInline(false);
    ctx.redraw();
  };
}

// ../TimingBench/src/editor/touch.js
function attachTouchUI(ctx, dom) {
  var topbar = dom.topbar, panel = dom.tbpanel, tbmoreEl = dom.tbmore, toast = dom.toast;
  var dock = dom.chardock, more = dom.charmore;
  var state = ctx.state;
  var toastTimer = null;
  function say(t) {
    if (!toast) return;
    toast.textContent = String(t);
    var dz = document.getElementById("dockzone");
    toast.style.setProperty("--toast-lift", (dz && dz.offsetHeight || 0) + "px");
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toast.classList.remove("show");
    }, 1900);
  }
  ctx.say = say;
  var TOP_META = {
    undo: { txt: "\u21B6", name: "Undo (Ctrl+Z)" },
    redo: { txt: "\u21B7", name: "Redo (Ctrl+Y)" },
    layout: { txt: "\u21C4", name: "Split direction" },
    embed: { txt: "<>", name: "Embed code" }
  };
  var VIEW_TXT = "{ }";
  var VIEW_NAME = {
    diagram: "Code hidden \u2014 click to show code",
    both: "Code shown \u2014 click to hide code"
  };
  var topKey = "";
  function renderTopbar() {
    if (!topbar) return;
    var cmds = hudCmds(sceneOf(state));
    var cols = ctx.currentLayout ? ctx.currentLayout() === "cols" : true;
    var view = ctx.currentView ? ctx.currentView() : "both";
    var key = cmds.join(",") + "|" + state.undo.length + "|" + state.redo.length + "|" + (cols ? "C" : "R") + "|" + (state.embedCard ? "E" : "-") + "|" + view;
    if (key === topKey && topbar.childNodes.length) return;
    topKey = key;
    topbar.textContent = "";
    cmds.forEach(function(c) {
      if (c === "view") {
        var vname = VIEW_NAME[view] || VIEW_NAME.both;
        var vb = document.createElement("button");
        vb.type = "button";
        vb.className = "hudBtn viewBtn" + (view === "both" ? " sel" : "");
        vb.setAttribute("data-cmd", "view:toggle");
        vb.setAttribute("aria-pressed", view === "both" ? "true" : "false");
        vb.title = vname;
        vb.setAttribute("aria-label", vname);
        vb.textContent = VIEW_TXT;
        topbar.appendChild(vb);
        return;
      }
      var m = TOP_META[c];
      if (!m) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hudBtn";
      b.setAttribute("data-cmd", c);
      var name = m.name;
      if (c === "layout") {
        name = cols ? "Code left / diagram right \u2014 click for stacked" : "Stacked \u2014 click for code left / diagram right";
      }
      b.textContent = c === "layout" ? cols ? "\u21C4" : "\u21C5" : m.txt;
      b.title = name;
      b.setAttribute("aria-label", name);
      var dim = c === "undo" && !state.undo.length || c === "redo" && !state.redo.length;
      if (dim) {
        b.disabled = true;
        b.classList.add("dim");
      }
      topbar.appendChild(b);
    });
  }
  if (topbar) topbar.addEventListener("click", function(e) {
    var b = e.target && e.target.closest ? e.target.closest("button[data-cmd]") : null;
    if (!b || b.disabled) return;
    ctx.doCmd(b.getAttribute("data-cmd"));
  });
  var baseNotify = ctx.notify;
  ctx.notify = function(t, bad, el) {
    baseNotify(t, bad, el);
    if (t) say(t);
  };
  var ICONS = {
    name: '<path d="M5 7h14M5 12h11M5 17h13"/>',
    wave: '<path d="M3 15h3v-6h4v6h4V9h4v6h3"/>',
    data: '<rect x="4" y="8" width="16" height="8" rx="1"/><path d="M10 8v8M14 8v8"/>',
    nodeStr: '<path d="M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3.2"/>',
    phase: '<text x="12" y="17.5" text-anchor="middle" font-size="16" font-family="Georgia,serif" fill="currentColor" stroke="none">\u03C6</text>',
    period: '<path d="M4 12h16"/><path d="M7.5 8.5L4 12l3.5 3.5M16.5 8.5L20 12l-3.5 3.5"/>',
    up: '<path d="M12 19V6M7 11l5-5 5 5"/>',
    down: '<path d="M12 5v13M7 13l5 5 5-5"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    spacer: '<path d="M4 9h16M4 15h16"/>',
    del: '<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/>',
    // 格级：标签=带孔的吊牌（清晰可辨的「标注」意象），节点=带实心点的环（锚点标记）。
    // 与行级的 data / nodeStr（整行）刻意画得不同，免得两个图标看着一样却差一个量级。
    label: '<path d="M4 7h9l7 7-7 7H4z"/><circle cx="8.5" cy="11.5" r="1.5"/>',
    node: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
    insert: '<path d="M8.5 5v14M15.5 5v14"/><path d="M12 9.5v5M9.5 12h5"/>',
    delCol: '<path d="M9 5v14"/><path d="M15 9l4.5 6M20 9l-4.5 6"/>',
    gap: '<path d="M12 5v14" stroke-dasharray="2.4 2.4"/>',
    append: '<path d="M9 5v14"/><path d="M14 12h6.5M17.25 8.75v6.5"/>',
    // 分组三件套：花括号 + 行线 / 范围向外推一行的箭头（画成「范围在长」而不是「行在动」）
    group: '<path d="M8 4c-2.2 0-3 1-3 3v10c0 2 .8 3 3 3"/><path d="M12 8h8M12 12h8M12 16h8"/>',
    spanUp: '<path d="M4 20h16"/><path d="M12 16V7M8 11l4-4 4 4"/>',
    spanDown: '<path d="M4 4h16"/><path d="M12 8v9M8 13l4 4 4-4"/>',
    link: '<circle cx="6.5" cy="12" r="2.6"/><circle cx="17.5" cy="12" r="2.6"/><path d="M9.1 12h5.8"/>'
  };
  var ICON_KEY = { delete: "delCol" };
  function iconSvg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[ICON_KEY[name] || name] || "") + "</svg>";
  }
  var NAMES = {
    name: "signal name",
    wave: "row wave",
    data: "row data",
    nodeStr: "row node",
    label: "cell data label",
    node: "cell node marker",
    phase: "phase",
    period: "period",
    up: "move up",
    down: "move down",
    add: "add row",
    spacer: "add spacer",
    del: "delete row",
    insert: "insert cycle",
    delete: "delete cycle",
    gap: "phase line",
    append: "append cycle",
    group: "group rows",
    spanUp: "extend row range up",
    spanDown: "extend row range down",
    link: "connect two nodes (wire)"
  };
  var ROW_ACTS = ACTS.row;
  var COL_ACTS = ACTS.col;
  var DOCK_ACTS = ACTS.dock;
  function needCell() {
    if (state.selCell && state.ir) return state.selCell;
    say("Select a wave cell first");
    return null;
  }
  function needLane() {
    if (state.selLane && state.ir) return state.selLane;
    say("Select a signal row first");
    return null;
  }
  function needCol() {
    if (state.ir && state.sel !== null && state.sel !== void 0) return state.sel;
    say("Select a column first");
    return null;
  }
  function doAct(k) {
    var c, l, n;
    switch (k) {
      case "char":
        c = needCell();
        if (c) ctx.openCellCharEditor(c.lane, c.tick);
        return;
      case "label":
        c = needCell();
        if (c) ctx.openLabelEditor(c.lane, c.tick);
        return;
      case "node":
        c = needCell();
        if (c) ctx.openNodeEditor(c.lane, c.tick, "");
        return;
      case "link":
        ctx.doCmd("link");
        return;
      case "name":
        l = needLane();
        if (l) ctx.openInlineFor({ nameLane: l });
        return;
      // phase 走图形化的相位尺（连续量，拖动比敲数字快得多）；其余仍是文本输入
      case "phase":
        l = needLane();
        if (l && ctx.openPhaseEdit) ctx.openPhaseEdit(l);
        return;
      case "wave":
      case "data":
      case "nodeStr":
      case "period":
        l = needLane();
        if (l) ctx.openRowEditor(l, { wave: "wave", data: "data", nodeStr: "node", period: "period" }[k]);
        return;
      case "up":
      case "down":
        l = needLane();
        if (l) ctx.commit({ t: "moveLane", lane: l, v: k }, k === "up" ? "move row up" : "move row down");
        return;
      case "add":
      case "spacer":
      case "del":
        l = needLane();
        if (l) ctx.handleTool(k, l);
        return;
      // 分组：group 打开组名输入（作用于当前行范围），spanUp / spanDown 把范围向外推一行
      case "group":
        if (!needLane()) return;
        if (ctx.openGroupEditor) ctx.openGroupEditor();
        return;
      case "spanUp":
      case "spanDown":
        if (!needLane()) return;
        if (ctx.extendSpan) ctx.extendSpan(k === "spanUp" ? -1 : 1);
        return;
      case "insert":
      case "delete":
      case "gap":
        c = needCol();
        if (c === null) return;
        n = state.ir.ticks;
        if (c >= n && k !== "insert") {
          say("The trailing column can only append");
          return;
        }
        ctx.handleColAct(k, c);
        return;
      case "append":
        if (!state.ir) {
          say("Canvas not ready");
          return;
        }
        ctx.handleColAct("insert", state.ir.ticks);
        return;
    }
  }
  function bindLongName(root) {
    if (!TOUCH) return;
    var els = root.querySelectorAll("[data-name]");
    for (var i = 0; i < els.length; i++) (function(el) {
      var t = null, x0 = 0, y0 = 0;
      function cancel() {
        if (t) {
          clearTimeout(t);
          t = null;
        }
      }
      el.addEventListener("pointerdown", function(e) {
        cancel();
        x0 = e.clientX;
        y0 = e.clientY;
        t = setTimeout(function() {
          t = null;
          say(el.getAttribute("data-name"));
        }, 480);
      });
      el.addEventListener("pointermove", function(e) {
        if (t && (Math.abs(e.clientX - x0) > 12 || Math.abs(e.clientY - y0) > 12)) cancel();
      });
      el.addEventListener("pointerup", cancel);
      el.addEventListener("pointercancel", cancel);
      el.addEventListener("pointerleave", cancel);
    })(els[i]);
  }
  var ctxKind = null, ctxKey = null, ctxActKey = "", ctxLinkFlag = "-", ctxMoreOpen = false, ctxHiddenActs = [];
  var ctxScroll = null;
  var selfScrollTop = null;
  function hideContext() {
    ctxKind = null;
    ctxKey = null;
    ctxActKey = "";
    ctxMoreOpen = false;
    ctxHiddenActs = [];
    panel.classList.remove("open");
    panel.textContent = "";
    if (tbmoreEl) {
      tbmoreEl.textContent = "";
      tbmoreEl.classList.remove("open");
    }
    syncMoreHeight();
  }
  function laneById(id) {
    if (!state.ir || !id) return null;
    for (var i = 0; i < state.ir.lanes.length; i++) {
      if (state.ir.lanes[i].id === id) return state.ir.lanes[i];
    }
    return null;
  }
  function availCell(act) {
    var sc = state.selCell;
    if (!sc) return false;
    var l = laneById(sc.lane);
    if (!l || l.kind !== "signal") return false;
    if (act === "link") return true;
    if (act === "node") return sc.tick < l.slots.length;
    if (act === "label") {
      var sl = l.slots[sc.tick];
      return !!sl && !!sl.point && !sl.gap && Core.BUS.test(sl.w);
    }
    return false;
  }
  function availRow(act) {
    var l = laneById(state.selLane);
    if (!l || !state.ir) return false;
    var li = state.ir.lanes.indexOf(l), n = state.ir.lanes.length;
    var isSp = l.kind === "spacer";
    switch (act) {
      case "name":
      case "wave":
      case "data":
      case "nodeStr":
      case "phase":
      case "period":
        return !isSp;
      case "link":
        return !isSp;
      // 连线要落到具体格子上，空行没有格子
      case "up":
        return li > 0;
      case "down":
        return li >= 0 && li < n - 1;
      default:
        return true;
    }
  }
  function availCol(act) {
    var c = state.sel;
    if (c === null || c === void 0 || !state.ir) return false;
    if (act === "insert" || act === "append" || act === "link") return true;
    return c < state.ir.ticks;
  }
  function makeCtxBtn(k) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ctxbtn";
    b.setAttribute("data-act", k);
    b.setAttribute("data-name", NAMES[k] || k);
    b.setAttribute("aria-label", NAMES[k] || k);
    b.title = NAMES[k] || k;
    if (k === "link") b.setAttribute("aria-pressed", String(!!state.linkMode));
    b.innerHTML = iconSvg(k);
    return b;
  }
  function renderContext() {
    if (!panel) return;
    if (ctx.inlineCtx) {
      hideContext();
      return;
    }
    var kind = null, acts = null, key = null, laneOf = null;
    if (state.selCell && state.ir) {
      hideContext();
      return;
    }
    if (state.sel !== null && state.sel !== void 0) {
      kind = "col";
      acts = COL_ACTS.filter(availCol);
      key = state.sel;
    } else if (state.selLane) {
      kind = "row";
      acts = ROW_ACTS.filter(availRow);
      key = state.selLane;
      laneOf = state.selLane;
    }
    if (!kind) {
      hideContext();
      return;
    }
    var ctxW = TOUCH ? 44 : 32, ctxGap = TOUCH ? 8 : 4, padX = 16;
    var host = panel.parentElement;
    var avail = (host ? host.clientWidth : panel.clientWidth) - padX;
    var fitAll = Math.floor((avail + ctxGap) / (ctxW + ctxGap));
    var fit, hiddenActs;
    if (fitAll >= acts.length) {
      fit = acts.length;
      hiddenActs = [];
    } else {
      fit = Math.max(0, Math.floor((avail - ctxW - ctxGap) / (ctxW + ctxGap)));
      fit = Math.min(fit, acts.length);
      hiddenActs = acts.slice(fit);
    }
    var linkFlag = state.linkMode ? "L" : "-";
    var actKey = acts.join(",") + "|" + fit;
    if (ctxKind === kind && ctxKey === key && ctxActKey === actKey && ctxLinkFlag === linkFlag && panel.classList.contains("open") && panel.childNodes.length) {
      paintCtxMore();
      return;
    }
    ctxKind = kind;
    ctxKey = key;
    ctxActKey = actKey;
    ctxLinkFlag = linkFlag;
    ctxHiddenActs = hiddenActs;
    panel.textContent = "";
    acts.slice(0, fit).forEach(function(k) {
      panel.appendChild(makeCtxBtn(k));
    });
    if (hiddenActs.length) {
      var mb = document.createElement("button");
      mb.type = "button";
      mb.className = "ctxbtn more";
      mb.setAttribute("data-ctxmore", "1");
      mb.setAttribute("data-name", "more actions");
      mb.setAttribute("aria-label", "More actions");
      mb.title = "More actions";
      mb.innerHTML = "<span>\u22EF</span>";
      panel.appendChild(mb);
    } else if (tbmoreEl) {
      tbmoreEl.textContent = "";
      tbmoreEl.classList.remove("open");
    }
    panel.classList.add("open");
    bindLongName(panel);
    paintCtxMore();
    ctxScroll = ctx.wrap ? { left: ctx.wrap.scrollLeft, top: ctx.wrap.scrollTop } : null;
    if (laneOf !== null && ctx.revealLane && TOUCH) {
      var top0 = ctx.wrap ? ctx.wrap.scrollTop : 0;
      ctx.revealLane(laneOf);
      selfScrollTop = ctx.wrap && ctx.wrap.scrollTop !== top0 ? { left: ctx.wrap.scrollLeft, top: ctx.wrap.scrollTop } : null;
    }
  }
  function onCtxClick(e) {
    var mb = e.target && e.target.closest ? e.target.closest("button[data-ctxmore]") : null;
    if (mb) {
      ctxMoreOpen = !ctxMoreOpen;
      paintCtxMore();
      return;
    }
    var b = e.target && e.target.closest ? e.target.closest("button[data-act]") : null;
    if (!b) return;
    doAct(b.getAttribute("data-act"));
  }
  if (panel) panel.addEventListener("click", onCtxClick);
  if (tbmoreEl) tbmoreEl.addEventListener("click", onCtxClick);
  var QUICK = ["0", "1", "x", "z"];
  var dockKey = null, moreOpen = false, dockHidden = [], lastDockH = -1;
  function hideDock() {
    dockKey = null;
    moreOpen = false;
    dockHidden = [];
    if (dock) {
      dock.textContent = "";
      dock.classList.remove("open");
    }
    if (more) {
      more.textContent = "";
      more.classList.remove("open");
    }
    syncMoreHeight();
  }
  function chipButton(v) {
    return '<svg viewBox="0 0 ' + G.CHIP_W + " " + G.CHIP_H + '" aria-hidden="true">' + chipGlyph(v) + "</svg><span>" + esc(v) + "</span>";
  }
  function makeChip(v) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chipbtn" + (state.ch === v ? " on" : "");
    b.setAttribute("data-ch", v);
    var name = v + " \u2014 " + chipDesc(v);
    b.setAttribute("data-name", name);
    b.setAttribute("aria-label", "Write " + name);
    b.innerHTML = chipButton(v);
    return b;
  }
  function makeActBtn(act) {
    var pressed = act === "link" && !!state.linkMode;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chipbtn act" + (pressed ? " on" : "");
    b.setAttribute("data-cellact", act);
    b.setAttribute("data-name", NAMES[act] || act);
    b.setAttribute("aria-label", NAMES[act] || act);
    b.title = NAMES[act] || act;
    if (act === "link") b.setAttribute("aria-pressed", String(!!state.linkMode));
    b.innerHTML = iconSvg(act);
    return b;
  }
  function renderDock() {
    if (!dock) return;
    var visible = !state.readonly && !!state.selCell && !ctx.inlineCtx;
    if (!visible) {
      hideDock();
      return;
    }
    var chipW = TOUCH ? 48 : 30, gap = TOUCH ? 6 : 4;
    var moreW = TOUCH ? 44 : 30;
    var tailW = TOUCH ? 18 : 0;
    var actW = TOUCH ? 44 : 32;
    var acts = DOCK_ACTS.filter(availCell);
    var charsOn = !state.linkMode;
    var order = QUICK.concat(Core.ALL.filter(function(v) {
      return QUICK.indexOf(v) < 0;
    }));
    if (state.ch && order.indexOf(state.ch) < 0) order.unshift(state.ch);
    var items = [];
    acts.forEach(function(a) {
      items.push({ t: "act", k: a });
    });
    if (charsOn) order.forEach(function(v) {
      items.push({ t: "ch", v });
    });
    var host = dock.parentElement;
    var budget = (host ? host.clientWidth : dock.clientWidth) - 16 - tailW;
    var SEP = TOUCH ? 17 : 15;
    var fit = 0, used = 0, seenActFit = false, sepDoneFit = false;
    for (var fi = 0; fi < items.length; fi++) {
      var it = items[fi];
      var w = it.t === "act" ? actW : chipW;
      var add = (fit ? gap : 0) + w;
      if (it.t === "ch" && seenActFit && !sepDoneFit) add += SEP;
      var reserve = fi < items.length - 1 ? gap + moreW : 0;
      if (used + add + reserve > budget) break;
      used += add;
      fit++;
      if (it.t === "act") seenActFit = true;
      if (it.t === "ch" && seenActFit) sepDoneFit = true;
    }
    var hidden = items.slice(fit);
    var key = state.selCell.lane + "@" + state.selCell.tick + "|" + state.ch + "|" + fit + "|" + items.length + "|" + (charsOn ? "-" : "L");
    if (key === dockKey) {
      paintMore();
      return;
    }
    dockKey = key;
    dockHidden = hidden;
    dock.textContent = "";
    var seenAct = false, sepDone = false;
    items.slice(0, fit).forEach(function(it2) {
      if (it2.t === "ch" && seenAct && !sepDone) {
        var dp = document.createElement("span");
        dp.className = "docksep";
        dock.appendChild(dp);
        sepDone = true;
      }
      if (it2.t === "act") {
        seenAct = true;
        dock.appendChild(makeActBtn(it2.k));
      } else dock.appendChild(makeChip(it2.v));
    });
    if (more && hidden.length) {
      var mb = document.createElement("button");
      mb.type = "button";
      mb.className = "chipbtn more";
      mb.setAttribute("data-more", "1");
      mb.setAttribute("data-name", "more characters");
      mb.setAttribute("aria-label", "More characters");
      mb.innerHTML = "<span>\u22EF</span>";
      dock.appendChild(mb);
    } else if (more) {
      more.textContent = "";
      more.classList.remove("open");
    }
    dock.classList.add("open");
    bindLongName(dock);
    paintMore();
  }
  function paintMore() {
    if (!more) return;
    var mb = dock.querySelector(".chipbtn.more");
    var open = !!moreOpen && dockHidden.length > 0;
    if (mb) {
      mb.classList.toggle("on", open);
      mb.setAttribute("aria-expanded", String(open));
    }
    if (open) {
      if (!more.classList.contains("open")) {
        more.textContent = "";
        dockHidden.forEach(function(it) {
          more.appendChild(it.t === "act" ? makeActBtn(it.k) : makeChip(it.v));
        });
        more.classList.add("open");
        bindLongName(more);
      }
    } else if (more.classList.contains("open")) {
      more.textContent = "";
      more.classList.remove("open");
    }
    syncMoreHeight();
  }
  function paintCtxMore() {
    if (!panel) return;
    var mb = panel.querySelector(".ctxbtn.more");
    var open = !!ctxMoreOpen && ctxHiddenActs.length > 0;
    if (mb) {
      mb.classList.toggle("on", open);
      mb.setAttribute("aria-expanded", String(open));
    }
    if (tbmoreEl) {
      if (open) {
        if (!tbmoreEl.classList.contains("open")) {
          tbmoreEl.textContent = "";
          ctxHiddenActs.forEach(function(k) {
            tbmoreEl.appendChild(makeCtxBtn(k));
          });
          tbmoreEl.classList.add("open");
          bindLongName(tbmoreEl);
        }
      } else if (tbmoreEl.classList.contains("open")) {
        tbmoreEl.textContent = "";
        tbmoreEl.classList.remove("open");
      }
    }
    syncMoreHeight();
  }
  function isBigView() {
    var el = document.documentElement;
    return !el.classList.contains("is-embed") || !!state.fsEdit;
  }
  function syncMoreHeight() {
    var dz = dock ? dock.parentElement : null;
    if (dz) dz.classList.toggle("more-up", isBigView());
    var h = dz && dz.offsetHeight || 0;
    if (lastDockH < 0) {
      lastDockH = h;
      return;
    }
    if (h !== lastDockH) {
      lastDockH = h;
      if (ctx.reportHeight) ctx.reportHeight();
    }
  }
  function onDockClick(e) {
    var b = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!b) return;
    if (b.getAttribute("data-more")) {
      moreOpen = !moreOpen;
      paintMore();
      return;
    }
    var ca = b.getAttribute("data-cellact");
    if (ca) {
      doAct(ca);
      return;
    }
    var ch = b.getAttribute("data-ch");
    if (ch) {
      moreOpen = false;
      ctx.writeChar(ch);
    }
  }
  if (dock) dock.addEventListener("click", onDockClick);
  if (more) more.addEventListener("click", onDockClick);
  ctx.closeCharDock = hideDock;
  ctx.afterRedraw = function() {
    renderTopbar();
    renderContext();
    renderDock();
  };
  if (ctx.wrap) ctx.wrap.addEventListener("scroll", function() {
    if (selfScrollTop && Math.abs(ctx.wrap.scrollLeft - selfScrollTop.left) < 2 && Math.abs(ctx.wrap.scrollTop - selfScrollTop.top) < 2) {
      selfScrollTop = null;
      return;
    }
    selfScrollTop = null;
    if (ctxScroll && Math.abs(ctx.wrap.scrollLeft - ctxScroll.left) < 2 && Math.abs(ctx.wrap.scrollTop - ctxScroll.top) < 2) {
      return;
    }
    ctxScroll = null;
    hideContext();
  }, { passive: true });
  ctx.closePanel = hideContext;
  ctx.hideToast = function() {
    if (toast) {
      clearTimeout(toastTimer);
      toast.classList.remove("show");
    }
  };
  function guide() {
    if (!TOUCH) return;
    if (ctx.isReadonly && ctx.isReadonly()) return;
    var cell = ctx.wrap && ctx.wrap.querySelector("rect.cell");
    if (!cell) return;
    var r = cell.getBoundingClientRect();
    if (r.width < 1) return;
    var g = document.createElement("div");
    g.className = "gesture";
    g.setAttribute("aria-hidden", "true");
    g.style.left = r.left + r.width / 2 + "px";
    g.style.top = r.top + r.height / 2 + "px";
    g.innerHTML = '<i class="ring r1"></i><i class="ring r2"></i><i class="finger"></i>';
    document.body.appendChild(g);
    setTimeout(function() {
      if (g.parentNode) g.parentNode.removeChild(g);
    }, 2400);
  }
  setTimeout(function() {
    if (ctx.isReadonly && ctx.isReadonly()) return;
    var c = ctx.wrap && ctx.wrap.querySelector("rect.cell");
    if (!c) return;
    guide();
  }, 500);
}

// ../TimingBench/src/editor/index.js
function createEditor(dom) {
  var root = dom.root || document.documentElement;
  var listeners = [];
  var runtime = {
    on: function(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    },
    destroy: function() {
      for (var i = 0; i < listeners.length; i++) {
        var a = listeners[i];
        try {
          a[0].removeEventListener(a[1], a[2], a[3]);
        } catch (e) {
        }
      }
      listeners.length = 0;
    }
  };
  var ctx = {
    code: dom.code,
    wrap: dom.wrap,
    gutter: dom.gutter,
    errdot: dom.errdot,
    EXAMPLE,
    state: {
      ir: null,
      undo: [],
      redo: [],
      sel: null,
      selCell: null,
      selLane: null,
      selRows: null,
      ratio: 1,
      parseOK: false,
      ch: "1",
      connect: null,
      linkMode: false,
      linkCursor: null,
      edgeIdx: 0,
      phaseEdit: null,
      zoom: 1,
      // 默认视图：双栏（左源码 / 右波形）。嵌入已移除，没有别的默认值。
      W: 0,
      H: 0,
      drag: null,
      rev: 0,
      readonly: false,
      view: "both"
    },
    inlineCtx: null,
    painting: null
  };
  ctx.on = runtime.on;
  ctx.destroy = runtime.destroy;
  var state = ctx.state, code = ctx.code, gutter = ctx.gutter, errdot = ctx.errdot;
  var codeEditBase = null, lastCodeInput = 0, timer = null;
  function denyRing(el) {
    var svg = ctx.svgRoot && ctx.svgRoot();
    if (!svg || !el || !el.getBoundingClientRect || !svg.getScreenCTM) return;
    var r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return;
    var inv = svg.getScreenCTM();
    if (!inv) return;
    inv = inv.inverse();
    var a = svg.createSVGPoint(), b = svg.createSVGPoint();
    a.x = r.left;
    a.y = r.top;
    b.x = r.right;
    b.y = r.bottom;
    a = a.matrixTransform(inv);
    b = b.matrixTransform(inv);
    var ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    ring.setAttribute("class", "denyRing");
    ring.setAttribute("x", Math.round(a.x) - 3);
    ring.setAttribute("y", Math.round(a.y) - 3);
    ring.setAttribute("width", Math.max(8, Math.round(b.x - a.x) + 6));
    ring.setAttribute("height", Math.max(8, Math.round(b.y - a.y) + 6));
    ring.setAttribute("rx", "4");
    svg.appendChild(ring);
    setTimeout(function() {
      if (ring.parentNode) ring.parentNode.removeChild(ring);
    }, 480);
  }
  var errorListeners = [];
  function notify(t, bad, el) {
    if (bad) {
      errdot.hidden = false;
      errdot.title = String(t);
      errdot.classList.remove("pulse");
      void errdot.offsetWidth;
      errdot.classList.add("pulse");
      if (el) denyRing(el);
    } else {
      errdot.hidden = true;
      errdot.title = "";
    }
    ctx.lastError = bad ? String(t) : null;
    for (var i = 0; i < errorListeners.length; i++) {
      try {
        errorListeners[i](bad ? String(t) : null);
      } catch (e) {
      }
    }
  }
  function status() {
    if (state.parseOK) {
      errdot.hidden = true;
      errdot.title = "";
    }
  }
  if (errdot) {
    errdot.setAttribute("role", "button");
    errdot.setAttribute("tabindex", "0");
    errdot.setAttribute("aria-label", "Parse error \u2014 open the message");
    var showParseError = function() {
      if (!errdot.hidden && errdot.title && ctx.say) ctx.say(errdot.title);
    };
    errdot.addEventListener("click", showParseError);
    errdot.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showParseError();
      }
    });
  }
  function quotePos(l, tick) {
    if (!l.waveRange) return null;
    var base = l.waveRange[0] + 1, s = l.orig.wave, n = 0, i = 0;
    for (i = 0; i < s.length && n < tick; i++) {
      if (s[i] !== "<" && s[i] !== ">") n++;
    }
    return base + i;
  }
  function syncCode() {
    if (code.value !== state.ir.raw) {
      try {
        state.ir = Core.buildIR(code.value);
        state.parseOK = true;
      } catch (e) {
        notify("Source not parsed yet, diagram edit deferred: " + e.message, true);
        return false;
      }
    }
    return true;
  }
  function commit(op, label, skipUndo, noCaret) {
    if (!syncCode()) return;
    var before = { ir: state.ir, src: code.value, sel: state.sel };
    var ops = Array.isArray(op) ? op : [op], first = ops[0];
    var selLaneAfter = state.selLane;
    if (first.t === "addLane") selLaneAfter = "@" + first.at;
    else if (first.t === "moveLane") {
      var oi = -1;
      state.ir.lanes.forEach(function(x, i) {
        if (x.id === first.lane) oi = i;
      });
      selLaneAfter = "@" + (first.to !== void 0 && first.to !== null ? Math.max(0, Math.min(state.ir.lanes.length - 1, first.to)) : Math.max(0, Math.min(state.ir.lanes.length - 1, oi + (first.v === "up" ? -1 : 1))));
    } else if (first.t === "deleteLane") selLaneAfter = null;
    var next = state.ir;
    for (var oi2 = 0; oi2 < ops.length; oi2++) next = Core.applyOp(next, ops[oi2]);
    var res = Core.patchSource(state.ir, next);
    var parsed;
    try {
      parsed = Core.buildIR(res.src);
    } catch (e) {
      notify("Generated source does not parse: " + e.message, true);
      return;
    }
    if (Core.canon(parsed) !== Core.canon(next)) {
      notify("I2 invariant failed: generated source diverges from IR, rolled back", true);
      return;
    }
    if (!skipUndo) {
      state.undo.push(before);
      if (state.undo.length > 60) state.undo.shift();
      state.redo.length = 0;
    }
    state.ir = parsed;
    state.ratio = res.ratio;
    code.value = res.src;
    state.parseOK = true;
    if (typeof selLaneAfter === "string" && selLaneAfter.charAt(0) === "@") {
      var ski = +selLaneAfter.slice(1);
      state.selLane = parsed.lanes[ski] ? parsed.lanes[ski].id : null;
    } else state.selLane = selLaneAfter;
    if (next.lanes.length === parsed.lanes.length) {
      next.lanes.forEach(function(nl, i) {
        var pl = parsed.lanes[i];
        if (!pl || !nl.slots || !pl.slots || nl.slots.length !== pl.slots.length) return;
        nl.slots.forEach(function(s, j) {
          if (s.saved) pl.slots[j].saved = { w: s.saved.w, label: s.saved.label };
        });
      });
    }
    state.rev++;
    clampSpan();
    ctx.redraw();
    ctx.status();
    notify(label);
    var l = null;
    state.ir.lanes.forEach(function(x) {
      if (x.id === (first.lane || first.lanes && first.lanes[0])) l = x;
    });
    if (!noCaret && l && first.tick !== void 0) {
      var pos = quotePos(l, first.tick);
      if (pos !== null) {
        try {
          code.setSelectionRange(pos, pos + 1);
        } catch (e) {
        }
      }
    }
  }
  function fromCode(src) {
    var ir;
    try {
      ir = Core.buildIR(src);
    } catch (e) {
      state.parseOK = false;
      ctx.status();
      notify("Draft: " + e.message + (e.pos !== void 0 ? " (offset " + e.pos + ")" : "") + "; keeping the last valid diagram", true);
      return;
    }
    state.ir = ir;
    state.parseOK = true;
    state.sel = null;
    state.ratio = 1;
    state.connect = null;
    state.rev++;
    if (ctx.lastError) notify(null);
    ctx.redraw();
    ctx.status();
  }
  function renderGutter() {
    var n = code.value.split("\n").length, s = [];
    for (var i = 1; i <= n; i++) s.push(i);
    gutter.textContent = s.join("\n");
    gutter.scrollTop = code.scrollTop;
  }
  function currentLayout() {
    if (state.layout) return state.layout;
    return typeof window !== "undefined" && window.innerWidth >= 860 ? "cols" : "rows";
  }
  function applyLayout() {
    if (!dom.app) return;
    if (state.layout) dom.app.setAttribute("data-layout", state.layout);
    else dom.app.removeAttribute("data-layout");
  }
  function toggleLayout() {
    state.layout = currentLayout() === "cols" ? "rows" : "cols";
    try {
      localStorage.setItem("tb-layout", state.layout);
    } catch (e) {
    }
    applyLayout();
    ctx.redraw();
  }
  ctx.currentLayout = currentLayout;
  ctx.toggleLayout = toggleLayout;
  var VIEWS = { diagram: 1, both: 1 };
  function currentView() {
    return VIEWS[state.view] ? state.view : "both";
  }
  function focusEl(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch (e) {
      try {
        el.focus();
      } catch (e2) {
      }
    }
  }
  function setView(v) {
    if (!VIEWS[v] || v === state.view) return;
    state.view = v;
    applyView();
    if (!state.readonly) focusEl(v === "diagram" ? ctx.wrap : code);
    ctx.redraw();
  }
  function applyView() {
    if (!dom.app) return;
    dom.app.setAttribute("data-view", currentView());
  }
  ctx.currentView = currentView;
  ctx.setView = setView;
  ctx.applyView = applyView;
  function spanLanes() {
    if (!state.ir) return [];
    var ids = state.selRows;
    if (!ids || !ids.length) return state.selLane ? state.ir.lanes.filter(function(l) {
      return l.id === state.selLane;
    }) : [];
    return state.ir.lanes.filter(function(l) {
      return ids.indexOf(l.id) >= 0;
    });
  }
  function setRowSpan(aId, bId, anchorId) {
    if (!state.ir) return;
    var a = -1, b = -1;
    state.ir.lanes.forEach(function(l, i2) {
      if (l.id === aId) a = i2;
      if (l.id === bId) b = i2;
    });
    if (a < 0 || b < 0 || a === b) {
      state.selRows = null;
      if (a >= 0) state.selLane = aId;
      return;
    }
    var lo = Math.min(a, b), hi = Math.max(a, b), out = [];
    for (var i = lo; i <= hi; i++) out.push(state.ir.lanes[i].id);
    state.selRows = out;
    state.selLane = anchorId || aId;
    state.selCell = null;
    state.sel = null;
  }
  function extendSpan(dir) {
    if (!state.ir || !state.selLane) return;
    var cur = spanLanes();
    if (!cur.length) return;
    var top = cur[0], bot = cur[cur.length - 1], ti = -1, bi = -1;
    state.ir.lanes.forEach(function(l, i) {
      if (l.id === top.id) ti = i;
      if (l.id === bot.id) bi = i;
    });
    if (dir < 0) {
      if (ti <= 0) return;
      setRowSpan(bot.id, state.ir.lanes[ti - 1].id, state.selLane);
    } else {
      if (bi >= state.ir.lanes.length - 1) return;
      setRowSpan(top.id, state.ir.lanes[bi + 1].id, state.selLane);
    }
    ctx.redraw();
  }
  function clampSpan() {
    if (!state.selRows || !state.ir) return;
    var idxs = [], anchor = -1;
    state.ir.lanes.forEach(function(l, i) {
      if (state.selRows.indexOf(l.id) >= 0) idxs.push(i);
      if (l.id === state.selLane) anchor = i;
    });
    var contiguous = idxs.length >= 2 && idxs[idxs.length - 1] - idxs[0] + 1 === idxs.length;
    if (!contiguous || anchor < idxs[0] || anchor > idxs[idxs.length - 1]) state.selRows = null;
  }
  function signalLanes() {
    var out = [];
    if (state.ir) state.ir.lanes.forEach(function(l) {
      if (l.kind === "signal") out.push(l);
    });
    return out;
  }
  function firstCell() {
    var ls = signalLanes();
    return ls.length ? { lane: ls[0].id, tick: 0 } : null;
  }
  function ensureSelCell() {
    if (!state.ir || state.linkMode) return state.selCell;
    if (!state.selCell) {
      var seated = null;
      if (state.selLane) state.ir.lanes.forEach(function(l) {
        if (l.id === state.selLane && l.kind === "signal") seated = { lane: l.id, tick: 0 };
      });
      state.selCell = seated || firstCell();
      if (state.selCell) {
        state.selLane = state.selCell.lane;
        ctx.redraw();
      }
    }
    return state.selCell;
  }
  function clampSel() {
    var sc = state.selCell;
    if (!sc || !state.ir) return sc;
    var N = Math.max(1, state.ir.ticks), found = false;
    state.ir.lanes.forEach(function(l) {
      if (l.id === sc.lane && l.kind === "signal") found = true;
    });
    if (!found) {
      var f = firstCell();
      sc = { lane: f ? f.lane : sc.lane, tick: Math.min(sc.tick, N - 1) };
    } else sc = { lane: sc.lane, tick: Math.max(0, Math.min(sc.tick, N - 1)) };
    state.selCell = sc;
    state.selLane = sc.lane;
    return sc;
  }
  function focusPane(which) {
    if (which === "src") {
      try {
        code.focus({ preventScroll: true });
      } catch (e) {
        code.focus();
      }
      return;
    }
    focusCanvas();
    ensureSelCell();
  }
  function setLinkMode(on) {
    on = !!on;
    var from = state.selCell, lc = null;
    if (on && state.ir) {
      var N = state.ir.ticks;
      var at = function(id, tick) {
        return id ? { lane: id, tick: Math.max(0, Math.min(tick, N - 1)) } : null;
      };
      var isSig = function(id) {
        var hit = false;
        state.ir.lanes.forEach(function(l) {
          if (l.id === id && l.kind === "signal") hit = true;
        });
        return hit;
      };
      if (from && isSig(from.lane)) lc = at(from.lane, from.tick);
      else if (state.selLane && isSig(state.selLane)) lc = at(state.selLane, 0);
      else if (state.sel !== null && state.sel !== void 0) {
        var sl = signalLanes();
        lc = sl.length ? at(sl[0].id, state.sel) : firstCell();
      } else lc = firstCell();
    }
    state.linkMode = on;
    state.connect = null;
    state.linkCursor = lc;
    ctx.painting = null;
    if (ctx.inlineCtx) ctx.closeInline(true);
    ctx.redraw();
    ctx.status();
  }
  function doCmd(act) {
    if (act === "link") {
      setLinkMode(!state.linkMode);
      return;
    }
    if (act === "layout") {
      toggleLayout();
      return;
    }
    if (act === "view:toggle") {
      setView(currentView() === "both" ? "diagram" : "both");
      return;
    }
    if (act === "view:diagram" || act === "view:both") {
      setView(act.slice(5));
      return;
    }
    if (act !== "undo" && act !== "redo") return;
    if (state.phaseEdit && ctx.closePhaseEdit) ctx.closePhaseEdit(true);
    var stack = act === "undo" ? state.undo : state.redo, back = act === "undo" ? state.redo : state.undo;
    if (!stack.length) return;
    var p = stack.pop();
    back.push({ ir: state.ir, src: code.value, sel: state.sel });
    state.ir = p.ir;
    state.sel = p.sel;
    code.value = p.src;
    state.parseOK = true;
    state.ratio = 1;
    state.selCell = null;
    state.connect = null;
    state.rev++;
    ctx.redraw();
    ctx.status();
  }
  function focusCanvas() {
    try {
      ctx.wrap.focus({ preventScroll: true });
    } catch (e) {
      try {
        ctx.wrap.focus();
      } catch (e2) {
      }
    }
  }
  var readonlyListeners = [];
  function setReadonly(on) {
    on = !!on;
    if (state.readonly === on) return;
    state.readonly = on;
    if (on) {
      state.selCell = null;
      state.sel = null;
      state.selLane = null;
      state.linkMode = false;
      state.connect = null;
      state.linkCursor = null;
      if (ctx.closePhaseEdit) ctx.closePhaseEdit(true);
      if (ctx.inlineCtx) ctx.closeInline(true);
      if (ctx.closePanel) ctx.closePanel();
      if (ctx.hideToast) ctx.hideToast();
      if (ctx.wrap.blur) try {
        ctx.wrap.blur();
      } catch (e) {
      }
    }
    root.classList.toggle("is-readonly", on);
    ctx.redraw();
    ctx.status();
    for (var i = 0; i < readonlyListeners.length; i++) readonlyListeners[i](on);
  }
  ctx.setReadonly = setReadonly;
  ctx.isReadonly = function() {
    return state.readonly;
  };
  ctx.onReadonlyChange = function(fn) {
    readonlyListeners.push(fn);
  };
  ctx.onError = function(fn) {
    errorListeners.push(fn);
    return function() {
      var i = errorListeners.indexOf(fn);
      if (i >= 0) errorListeners.splice(i, 1);
    };
  };
  ctx.notify = notify;
  ctx.status = status;
  ctx.renderGutter = renderGutter;
  ctx.denyRing = denyRing;
  ctx.syncCode = syncCode;
  ctx.commit = commit;
  ctx.fromCode = fromCode;
  ctx.doCmd = doCmd;
  ctx.setLinkMode = setLinkMode;
  ctx.focusCanvas = focusCanvas;
  ctx.quotePos = quotePos;
  ctx.focusPane = focusPane;
  ctx.ensureSelCell = ensureSelCell;
  ctx.clampSel = clampSel;
  ctx.spanLanes = spanLanes;
  ctx.setRowSpan = setRowSpan;
  ctx.extendSpan = extendSpan;
  ctx.clearSpan = function() {
    state.selRows = null;
  };
  try {
    var saved = localStorage.getItem("tb-layout");
    if (saved === "rows" || saved === "cols") state.layout = saved;
  } catch (e) {
  }
  applyLayout();
  applyView();
  createShapes(ctx);
  attachInteractions(ctx);
  attachTouchUI(ctx, dom);
  var paint = ctx.redraw;
  ctx.redraw = function() {
    paint();
    if (ctx.afterRedraw) ctx.afterRedraw();
  };
  ctx.wrap.tabIndex = 0;
  ctx.wrap.addEventListener("focus", function() {
    if (state.linkMode || state.readonly) return;
    var hasSel = state.selCell || state.selLane || state.sel !== null && state.sel !== void 0;
    if (hasSel) return;
    ensureSelCell();
  });
  var rzTimer = null, obsKey = "";
  function scheduleRedraw() {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(function() {
      obsKey = "";
      if (!ctx.inlineCtx) ctx.redraw();
    }, 120);
  }
  runtime.on(window, "resize", scheduleRedraw);
  if (typeof ResizeObserver !== "undefined") {
    try {
      new ResizeObserver(function() {
        var w = ctx.wrap, k = w.clientWidth + "x" + w.clientHeight;
        if (k === obsKey) return;
        obsKey = k;
        scheduleRedraw();
      }).observe(ctx.wrap);
    } catch (e) {
    }
  }
  code.addEventListener("scroll", function() {
    gutter.scrollTop = code.scrollTop;
  });
  code.addEventListener("input", function() {
    renderGutter();
    var now = Date.now();
    if (!codeEditBase || now - lastCodeInput > 1500) codeEditBase = { ir: state.ir, src: state.ir ? state.ir.raw : EXAMPLE, sel: state.sel };
    lastCodeInput = now;
    clearTimeout(timer);
    timer = setTimeout(function() {
      if (codeEditBase) {
        state.undo.push(codeEditBase);
        state.redo.length = 0;
        codeEditBase = null;
      }
      fromCode(code.value);
    }, 320);
  });
  code.value = dom.initial != null ? dom.initial : EXAMPLE;
  fromCode(code.value);
  return ctx;
}

// src/_tb-styles.js
var tb_styles_default = '/* \u5171\u4EAB\u6837\u5F0F\uFF1A\u4E3B\u9875\u9762\u4E0A\u4E0B\u5206\u533A + \u6CE2\u5F62\u56FE\u5143\u3002 */\n:host{--bg:#fff;--panel:#fff;--src-bg:#f7f7f7;--hover:rgba(0,0,0,.05);--ink:#1f2328;--muted:#6b7078;--line:rgba(0,0,0,.10);--line2:rgba(0,0,0,.30);--accent:#185fa5;--accent-bg:#e9f2fc;--ok:#1d9e75;--ok-bg:#e1f5ee;--warn:#ba7517;--warn-bg:#faeeda;--err:#c0392b;--err-bg:#fcebeb;--bus:#ba7517;--bus-bg:#faeeda;--bus2:#fff;--bus3:#ffffb4;--bus4:#ffe0b9;--bus5:#b9e0ff;--bus6:#ccfdfe;--bus7:#cdfdc5;--bus8:#f0c1fb;--bus9:#f5c2c0;--wave-ink:var(--ink);--mono:ui-monospace,SFMono-Regular,Consolas,monospace;--dock-acts:47px;--dock-chars:40px;--sans:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}\n@media (prefers-color-scheme:dark){:host{--bg:#191a1c;--panel:#222427;--src-bg:#202225;--hover:rgba(255,255,255,.07);--ink:#e9e9e6;--muted:#9b9b95;--line:rgba(255,255,255,.14);--line2:rgba(255,255,255,.3);--accent:#6cb0ee;--accent-bg:#14304a;--ok:#5dcaa5;--ok-bg:#12382b;--warn:#ef9f27;--warn-bg:#3a2a10;--err:#f09595;--err-bg:#3b1e1e;--bus:#ef9f27;--bus-bg:#3a2a10;--bus2:#3a3b3e;--bus3:#4a4a24;--bus4:#4a3520;--bus5:#1d3a55;--bus6:#1e4547;--bus7:#22452a;--bus8:#402748;--bus9:#4a2a28}}\n*{box-sizing:border-box}\n:host{display:block}\n.tb-root{margin:0;background:var(--bg);color:var(--ink);font:13px/1.6 var(--sans);overflow:hidden;display:flex;flex-direction:column;height:100%}\n/* \u5206\u5C4F\uFF1A\u5DE6\u53F3\uFF08\u5DE6\u4EE3\u7801 / \u53F3\u65F6\u5E8F\u56FE\uFF09\u4E3A\u9ED8\u8BA4\uFF1BHUD \u7684 \u21C4 / \u21C5 \u6309\u94AE\u53EF\u5207\u6210\u4E0A\u4E0B\uFF0C\u9009\u62E9\u4F1A\u8BB0\u4F4F\u3002\n   \u6CA1\u6709\u663E\u5F0F\u9009\u62E9\u65F6\u6309\u5BBD\u5EA6\u81EA\u9002\u5E94\uFF08\u7A84\u7A97\u53E3\u9000\u56DE\u4E0A\u4E0B\uFF0C\u89C1\u4E0B\u9762\u7684\u5A92\u4F53\u67E5\u8BE2\uFF09\u3002 */\n.app{display:grid;grid-template-columns:minmax(320px,34%) minmax(0,1fr);flex:1 1 auto;min-height:0}\n.app[data-layout="rows"]{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr)}\n.app[data-layout="rows"] .pane.src{border-right:0;border-bottom:1px solid var(--line)}\n.app[data-layout="cols"]{grid-template-columns:minmax(320px,34%) minmax(0,1fr);grid-template-rows:minmax(0,1fr)}\n.pane{position:relative;min-width:0;min-height:0;overflow:hidden}\n.pane.src{background:var(--src-bg);border-right:1px solid var(--line)}\n/* \u684C\u9762\u5BBD\u5C4F = \u5DE6\u4EE3\u7801 / \u53F3\u65F6\u5E8F\u56FE\uFF082026-11-13\uFF09\u3002\u7A84\u7A97\u53E3\uFF08\u9F20\u6807\u4F46\u6CA1\u6A2A\u5411\u7A7A\u95F4\uFF09\u56DE\u9000\u6210\u4E0A\u4E0B\u5206\u533A\uFF0C\n   \u89E6\u6478\u7AEF\u53E6\u6709\u81EA\u5DF1\u7684\u89C4\u5219\uFF08\u89C1 .is-touch \u6BB5\uFF09\u3002 */\n@media (max-width: 860px){\n  .app{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr)}\n  .pane.src{border-right:0;border-bottom:1px solid var(--line)}\n}\n.gutter{position:absolute;left:0;top:0;bottom:0;width:40px;padding:12px 9px 12px 0;text-align:right;font:12px/1.65 var(--mono);color:var(--muted);border-right:1px solid var(--line);overflow:hidden;white-space:pre;user-select:none;pointer-events:none;\n  /* \u884C\u53F7\u69FD\u5FC5\u987B**\u76D6\u4F4F**\u6A2A\u5411\u6EDA\u52A8\u540E\u94BB\u5230\u5B83\u4E0B\u9762\u7684\u6E90\u7801\uFF1Atextarea \u662F\u540E\u51FA\u73B0\u7684\u7EDD\u5BF9\u5B9A\u4F4D\u5143\u7D20\uFF0C\n     \u4E0D\u7ED9\u8FD9\u4E00\u5C42\u52A0\u4E0D\u900F\u660E\u5E95\u8272\u548C\u5C42\u5E8F\uFF0C\u957F\u884C\u5F80\u5DE6\u6EDA\u65F6\u5B57\u7B26\u4F1A\u538B\u5728\u884C\u53F7\u4E0A\uFF08\u4E24\u4E32\u6570\u5B57 / \u5B57\u6BCD\u53E0\u5728\u4E00\u8D77\uFF09\u3002\n     \u5E95\u8272\u4E0E .pane.src \u4E00\u81F4\uFF0C\u89C6\u89C9\u4E0A\u4ECD\u662F\u300C\u4E00\u6761\u8BA9\u51FA\u6765\u7684\u8FB9\u300D\u3002 */\n  background:var(--src-bg);z-index:2}\n/* \u53EA\u4F5C\u7528\u4E8E\u6E90\u7801\u6846\uFF1A.shareCode \u7B49\u5176\u5B83 textarea \u4E0D\u80FD\u88AB\u8FD9\u6761\u7EDD\u5BF9\u5B9A\u4F4D\u89C4\u5219\u8BEF\u4F24 */\n.pane.src textarea{position:absolute;inset:0;width:100%;height:100%;resize:none;border:0;outline:none;background:transparent;color:var(--ink);padding:12px 10px 12px 50px;font:12px/1.65 var(--mono);tab-size:2;white-space:pre;overflow:auto}\n/* \u6CE2\u5F62\u533A = \u753B\u5E03 + \u5E95\u90E8\u4E24\u6761\uFF08\u52A8\u4F5C / \u5B57\u7B26\uFF09\u3002\u4E24\u6761\u662F**\u771F\u5B9E\u7684 flex \u5B50\u9879**\uFF0C\n   \u6240\u4EE5\u4E0D\u518D\u76D6\u5728\u6CE2\u5F62\u4E0A\u3001\u4E5F\u4E0D\u9700\u8981\u753B\u5E03\u4E3A\u5B83\u4EEC\u9884\u7559\u9AD8\u5EA6\u3002 */\n.pane.diagram{position:relative;display:flex;flex-direction:column;min-height:0}\n.svgwrap{position:relative;flex:1 1 auto;min-height:0;overflow:auto;background:var(--bg);outline:none}\n/* \u505C\u9760\u533A**\u6052\u9AD8**\uFF1A\u52A8\u4F5C\u6761 + \u5B57\u7B26\u6761\u4E24\u6761\u90FD\u7B97\u8FDB\u9AD8\u5EA6\uFF0C\u54EA\u6015\u6B64\u523B\u53EA\u5F00\u4E86\u4E00\u6761\u3002\n   \u4E3A\u4EC0\u4E48\u5FC5\u987B\u6052\u9AD8\uFF08\u7528\u6237\u5B9E\u6D4B\u300C\u9009\u4E2D\u5143\u7D20\u53C8\u79FB\u52A8\u65F6\u753B\u9762\u53CD\u590D\u8DF3\u52A8\u300D\uFF09\uFF1A\n   \u66FE\u7531\u5185\u5BB9\u51B3\u5B9A\u9AD8\u5EA6 \u2014\u2014 \u5B57\u7B26\u6761\u53EA\u5728\u300C\u9009\u4E2D\u683C\u300D\u65F6\u51FA\u73B0\uFF0C\u4E8E\u662F\u70B9\u683C\u5B50\u753B\u5E03\u77EE 47px\u3001\u70B9\u884C\u540D\u53C8\u957F\u56DE 40px\uFF0C\n   \u753B\u5E03\u5E95\u8FB9\u8DDF\u7740\u8DF3\uFF0C120ms \u540E\u7684\u53BB\u6296\u91CD\u753B\u518D\u6765\u4E00\u6B21\u3002\u6240\u4EE5\u9AD8\u5EA6\u5FC5\u987B\u662F\u5E38\u91CF\u3002\n   **0.18.0\uFF1A\u5E38\u91CF\u53D6\u4E24\u8005\u7684\u8F83\u5927\u8005\uFF0C\u4E0D\u518D\u76F8\u52A0\u3002** \u56E0\u4E3A\u8FD9\u4E24\u6761\u5DF2\u7ECF**\u4E92\u65A5**\uFF1A\u4E0A\u4E0B\u6587\u6761\u53EA\u5728\u9009\u4E2D\n   \u884C / \u5217\u65F6\u51FA\u73B0\uFF0C\u5B57\u7B26\u505C\u9760\u6761\u53EA\u5728\u9009\u4E2D\u683C\u65F6\u51FA\u73B0\uFF08\u683C\u7EA7\u4E09\u4E2A\u52A8\u4F5C\u5DF2\u632A\u8FDB\u505C\u9760\u6761\u5DE6\u4FA7\uFF09\uFF0C\u540C\u4E00\u65F6\u523B\u6700\u591A\n   \u4E00\u6761\u3002\u6309\u300C\u4E24\u6761\u90FD\u5728\u300D\u9884\u7559\u7B49\u4E8E\u6C38\u8FDC\u7A7A\u7740\u4E00\u6574\u884C\uFF1B\u53D6 max \u65E2\u4FDD\u6301\u6052\u5B9A\uFF08\u4E0D\u6296\uFF09\uFF0C\u53C8\u53EA\u5360\u4E00\u884C\u3002\n   \u53EA\u8BFB\u5361\u7247\u4E0D\u9884\u7559\uFF08\u90A3\u91CC\u6CA1\u6709\u8FD9\u4E24\u6761\uFF0C`reportHeight` \u4E5F\u4E0D\u80FD\u88AB\u5B83\u6491\u9AD8\uFF09\u3002 */\n/* \u9875\u9762 / \u89E6\u6478\u7AEF\uFF1A\u6052\u9AD8\uFF08\u4E24\u6761\u5B50\u6761\u4E92\u65A5\uFF0C\u53D6 max \u5C31\u53EA\u5360\u4E00\u884C\uFF09\uFF0C\u5207\u6362\u9009\u4E2D\u5BF9\u8C61\u65F6\u7248\u9762\u4E00\u52A8\u4E0D\u52A8\u3002\n   \u5D4C\u5165\u5361\u7247\u5355\u72EC\u8986\u76D6\u6210 height:auto \u2014\u2014 \u5361\u7247\u662F\u300C\u8D34\u7740\u5185\u5BB9\u957F\u300D\u7684\uFF0C\u7559\u4E00\u6761\u6CA1\u6709\u6309\u94AE\u7684\u7A7A\u5E26\u5C31\u662F\u7EAF\u6D6A\u8D39\n   \uFF08\u7528\u6237\u5B9E\u6D4B\u300C\u6CE2\u5F62\u548C\u6700\u4E0B\u6392\u6309\u94AE\u4E4B\u95F4\u4E00\u6BB5\u65E0\u7528\u7A7A\u767D\u300D\uFF09\u3002 */\n.dockzone{position:relative;flex:0 0 auto;display:flex;flex-direction:column;justify-content:flex-end;z-index:20;\n  height:calc(max(var(--dock-acts), var(--dock-chars)) + env(safe-area-inset-bottom,0px))}\n/* \u56DB\u6761\u5B50\u6761\u5404\u81EA\u5B9A\u9AD8\u3001\u7EDD\u4E0D\u538B\u7F29\uFF1Adockzone \u7684\u9AD8\u5EA6\u662F\u6309\u5B83\u4EEC\u7684\u5B9E\u6D4B\u503C\u52A0\u51FA\u6765\u7684\uFF0C\n   \u4E00\u65E6\u5141\u8BB8 flex \u6536\u7F29\uFF0C\u6309\u94AE\u4F1A\u88AB\u538B\u6389\u51E0\u50CF\u7D20\uFF08\u5B9E\u6D4B panel 57 vs \u9700\u8981 60\uFF0C\u5E95\u8FB9\u76F4\u63A5\u88C1\u6389\uFF09\u3002 */\n.dockzone > *{flex:0 0 auto}\n.is-readonly .dockzone{height:0}\n/* \u5D4C\u5165\u5361\u7247\uFF1A\u6CA1\u6709\u6309\u94AE\u65F6\u4E0D\u5360\u4F4D\uFF080\uFF09\uFF0C\u6709\u6309\u94AE\u65F6\u53EA\u5360\u4E00\u884C\uFF1B\u4E24\u6761\u5B50\u6761\u540C\u9AD8 \u21D2 \u9009\u683C\u2194\u9009\u884C\u4E0D\u8DF3\u3002 */\n/* \u79BB\u5C4F\u6587\u672C\u6D4B\u91CF\u5BB9\u5668\uFF1A\u53EA\u7ED9 shapes.js \u91CF\u884C\u540D\u5BBD\u5EA6\u7528\uFF0C\u6C38\u8FDC\u4E0D\u53EF\u89C1\u3001\u4E0D\u5403\u4E8B\u4EF6 */\n.measure{position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;visibility:hidden;font-family:var(--sans)}\n/* \u952E\u76D8\u7528\u6237\u7528 Tab / F6 \u8FDB\u5165\u753B\u5E03\u65F6\u7ED9\u51FA\u53EF\u89C1\u7126\u70B9\uFF1B\u9F20\u6807\u70B9\u51FB\u4E0D\u663E\u793A */\n.svgwrap:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}\nsvg{display:block;font-family:var(--sans)}\n.errdot{position:absolute;right:10px;top:10px;width:8px;height:8px;border-radius:50%;background:var(--err);cursor:help;z-index:5}\n/* \u963B\u6B62\u7C7B\u63D0\u793A\uFF1A\u7EA2\u70B9\u8109\u51B2\u4E00\u6B21\uFF0C\u8BA9\u300C\u521A\u88AB\u62D2\u7EDD\u300D\u5728\u6E90\u7801\u533A\u4E5F\u6709\u4E00\u773C\u53EF\u89C1\u7684\u53CD\u9988\uFF08\u6587\u672C\u539F\u56E0\u4ECD\u5728 title \u91CC\uFF09 */\n.errdot.pulse{animation:dotPulse 700ms ease-out}\n@keyframes dotPulse{\n  0%{box-shadow:0 0 0 0 var(--err)}\n  55%{box-shadow:0 0 0 8px rgba(192,57,43,0)}\n  100%{box-shadow:0 0 0 0 rgba(192,57,43,0)}\n}\n/* \u88AB\u62E6\u4F4F\u7684\u76EE\u6807\u4E0A\u95EA\u4E00\u5708\u7EA2\u73AF\uFF1A\u53EA\u52A8\u4E0D\u900F\u660E\u5EA6\u4E0E\u7EBF\u5BBD\uFF0C\u4E0D\u4F4D\u79FB\u3001\u4E0D\u6539\u5E03\u5C40 */\n.denyRing{fill:none;stroke:var(--err);stroke-width:2.4;pointer-events:none;\n  animation:denyRing 460ms ease-out forwards}\n@keyframes denyRing{\n  0%{opacity:0;stroke-width:3.4}\n  15%{opacity:.95;stroke-width:3.4}\n  100%{opacity:0;stroke-width:1.2}\n}\n[hidden]{display:none!important}\n/* \u753B\u5E03\u5185\u4E0D\u518D\u6709 HUD\uFF08\u64A4\u9500 / \u91CD\u505A / \u5206\u5C4F / \u5D4C\u5165\u5DF2\u79FB\u5230\u9875\u9762\u9876\u680F\uFF09 */\n.colhead text{pointer-events:none}\n/* \u884C\u5934 / \u5217\u5934\uFF080.25.0\uFF09\uFF1A\u501F\u8868\u683C\u7684\u8BFB\u6CD5 \u2014\u2014 \u60AC\u505C\u5148\u7ED9\u4E00\u5C42\u6D45\u5E95\u9884\u89C8\uFF0C\u9009\u4E2D\u540E\u5B9A\u4F4F\u3002\n   \u884C\u5934\u662F\u884C\u540D\u533A\u90A3\u6761\u547D\u4E2D\u5E26\uFF1B\u5217\u5934\u662F\u8868\u5934\u90A3\u4E00\u683C\uFF0C\u60AC\u505C\u65F6\u6574\u5217\u94FA\u4E00\u5C42\uFF08.colBand \u753B\u5728\u8868\u5934\u7EC4\u91CC\uFF0C\n   \u9AD8\u5EA6\u5EF6\u4F38\u5230\u753B\u5E03\u5E95\u90E8\uFF09\u3002\u884C\u540D\u6587\u5B57\u672C\u8EAB\u4E0D\u63A5\u6536\u6307\u9488\uFF0C\u60AC\u505C\u968F\u6574\u6761\u884C\u5934\u8D70\uFF1B\u03C6 / T \u5FBD\u6807\u4F8B\u5916\u3002 */\n.laneHead{transition:fill .12s}\n.laneHead:hover{fill:var(--hover)}\n.laneHead.cur{fill:var(--hover)}            /* \u8FD9\u4E00\u884C\u91CC\u6709\u9009\u4E2D\u7684\u683C\u5B50\uFF1A\u7ED9\u4E2A\u5F31\u63D0\u793A\uFF0C\u4E0D\u94FA\u6574\u884C */\n.laneName{pointer-events:none}\n.laneName .laneMeta{pointer-events:all}     /* \u03C6 / T \u4ECD\u662F\u53EF\u70B9\u5165\u53E3\uFF08\u684C\u9762\u9760 tspan \u81EA\u8EAB\uFF09 */\n.colBand{fill:transparent;transition:fill .12s}\n.colhead:hover .colBand{fill:var(--hover)}\n.colhead.sel .colBand{fill:var(--accent-bg);opacity:.55}\n/* \u516D\u70B9\u628A\u624B\uFF080.25.0\uFF09\uFF1A\u53EA\u5728\u9009\u4E2D\u683C / \u9009\u4E2D\u884C\u65F6\u51FA\u73B0\uFF0C\u62D6\u52A8\u53EF\u79FB\u52A8\u6574\u884C / \u6574\u5217\u3002\n   \u9759\u6001\u65F6\u53EA\u7528 muted \u7070\u70B9\uFF0C\u4E0D\u62A2\u89C6\u89C9\uFF1B\u60AC\u505C\u53D8\u5F3A\u8C03\u8272\u5E76\u7ED9 grab \u5149\u6807\u3002 */\n.hnd{cursor:grab}\n.hnd:hover{fill:var(--accent)}\n.hnd:active{cursor:grabbing}\n.dropLine{stroke:var(--accent);stroke-width:2;stroke-dasharray:4 3;pointer-events:none}\n.cellSel{fill:none;stroke:var(--accent);stroke-width:1.6;stroke-dasharray:3 2;pointer-events:none}\n/* \u8FDE\u7EBF\u6A21\u5F0F\u7684\u7AEF\u70B9\u5149\u6807\uFF1A\u4E0E\u666E\u901A\u9009\u4E2D\u6846\u4E92\u65A5\uFF0C\u53EA\u670D\u52A1\u952E\u76D8 / \u89E6\u6478\u7AEF\u70B9\u5B9A\u4F4D */\n.linkCursor{fill:none;stroke:var(--accent);stroke-width:2;stroke-dasharray:5 3;pointer-events:none}\n.linkMode .linkCursor{stroke-width:2.4}\n/* \u6570\u636E\u6807\u7B7E\u7684\u7F16\u8F91\u5165\u53E3\u662F\u4E0A\u4E0B\u6587\u6761\uFF08ACTS.cell\uFF09\uFF0C\u753B\u5E03\u4E0A\u4E0D\u518D\u6709 \u270E \u5FBD\u6807 */\n.connectPreview{fill:none;stroke:var(--accent);stroke-width:1.6;stroke-dasharray:4 3;pointer-events:none;opacity:.8}\n/* \u5C31\u5730\u7F16\u8F91\uFF1A\u8F93\u5165\u6846\u662F SVG \u5185\u7684 foreignObject\uFF0C\u8DDF\u7740\u56FE\u5143\u4E00\u8D77\u6EDA\u52A8 */\n/* \u5E95\u90E8\u53EA\u4FDD\u7559\u4E0A\u4E0B\u6587\u64CD\u4F5C\u533A\uFF1A\u9009\u4E2D\u683C / \u8FDE\u7EBF\u6001\u624D\u51FA\u73B0\u5185\u5BB9 */\n.inline-fo{overflow:visible}\n.inline-edit{width:100%;height:100%;box-sizing:border-box;font:12px var(--mono);padding:2px 6px;border:1px solid var(--accent);border-radius:5px;background:var(--panel);color:var(--ink);box-shadow:0 3px 12px rgba(0,0,0,.22);outline:none}\n.inline-edit:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-bg),0 3px 12px rgba(0,0,0,.22)}\n/* \u96F6\u884C\u7A7A\u6001\uFF1A\u6574\u884C\u662F\u53EF\u70B9\u7684\u5360\u4F4D\u6309\u94AE\uFF0C\u60AC\u505C\u65F6\u63CF\u8FB9\u4E0E\u52A0\u53F7\u4E00\u8D77\u63D0\u4EAE */\n.emptyRow{cursor:pointer}\n.emptyRow:hover rect{stroke:var(--accent)}\n.emptyRow:hover .plusBox{fill:var(--accent-bg)}\n.emptyRow:hover .emptyWave{opacity:.7}\n.laneMeta{cursor:text}\n.laneMeta:hover{fill:var(--accent)}\n/* \u5206\u7EC4\u540D\u4EC5\u5728\u7F16\u8F91\u6001\u53EF\u70B9\u6539\uFF08\u6709 data-act \u65F6\u624D\u662F\u53EF\u70B9\u533A\u57DF\uFF09 */\n.laneGroupName[data-act]{cursor:text}\n.laneGroupName[data-act]:hover{fill:var(--accent)}\n/* \u5217\u5934\u53EA\u5269\u7F16\u53F7\uFF1A+ \u2212 | \u4E09\u4E2A\u5217\u52A8\u4F5C\u5DF2\u6536\u8FDB\u4E0A\u4E0B\u6587\u6761\uFF08#tbpanel\uFF09\uFF0C\u753B\u5E03\u4E0A\u4E0D\u518D\u60AC\u505C\u51FA\u6309\u94AE */\n.colhead{cursor:pointer}\n/* \u53C2\u8003\u4E0A\u6E38\u9ED8\u8BA4\u76AE\u80A4\u5916\u89C2\u89C4\u8303\u81EA\u884C\u7ED8\u5236\uFF1A\u5B9E\u7EBF / \u659C\u7EBF\u9634\u5F71 / \u865A\u7EBF / \u7BAD\u5934 / \u603B\u7EBF\u914D\u8272 */\n.waveInk,.waveHair,.waveDash,.waveArrow,.waveBus,.waveLabel{pointer-events:none}\n.waveInk{fill:none;stroke:var(--wave-ink);stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}\n.waveHair{fill:none;stroke:var(--wave-ink);stroke-width:.65;opacity:.8}\n.waveDash{fill:none;stroke:var(--wave-ink);stroke-width:1.25;stroke-dasharray:2 2}\n.waveArrow{fill:var(--wave-ink);stroke:none}\n.waveBus{stroke:none}\n/* bus \u6BB5\u7684\u8F6E\u5ED3\u5355\u72EC\u4E00\u6761 path\uFF1A\u6BB5\u5185\u4E0D\u753B\u7AD6\u8FB9\uFF0C\u6BB5\u4E0E\u6BB5\u4E4B\u95F4\u624D\u4E0D\u4F1A\u51FA\u73B0\u300C\u88AB\u5207\u4E00\u5200\u300D\u7684\u63A5\u7F1D */\n.waveBusInk{fill:none;stroke:var(--wave-ink);stroke-width:1;stroke-linejoin:round;pointer-events:none}\n.waveLabel{fill:var(--ink);font-size:10px}\n/* \u53EA\u8BFB\u5361\u7247\u4E0E\u7F16\u8F91\u6001\u5171\u7528\u540C\u4E00\u5957\u6392\u7248\uFF1A\u4E0D\u53E6\u8BBE\u5B57\u53F7 / \u5B57\u8272\uFF08\u53EA\u8BFB\u6001\u53EA\u662F\u5C11\u753B\u7F16\u8F91\u63A7\u4EF6\uFF09\u3002 */\n/* \u6E90\u7801 wave \u6BD4\u5168\u5C40\u5468\u671F\u6570\u77ED\u65F6\uFF0C\u5C3E\u90E8\u6309 repeater \u5EF6\u7EED\u753B\u51FA\u53EF\u7EED\u5199\u533A */\n.tailSlot{opacity:.78;pointer-events:none}\n.tailCell:hover{fill:var(--accent-bg)}\n.bus2{fill:var(--bus2)}.bus3{fill:var(--bus3)}.bus4{fill:var(--bus4)}.bus5{fill:var(--bus5)}\n.bus6{fill:var(--bus6)}.bus7{fill:var(--bus7)}.bus8{fill:var(--bus8)}.bus9{fill:var(--bus9)}\n/* ---------------------------------------------------------------------------\n   \u89E6\u6478\u7248\u5F0F\uFF1A\u7C97\u6307\u9488\uFF08\u6216 ?touch=1\uFF09\u65F6\u7531 main.js \u5728 <html> \u4E0A\u52A0 .is-touch\u3002\n   \u684C\u9762\u662F\u300C\u5DE6\u4EE3\u7801 / \u53F3\u65F6\u5E8F\u56FE\u300D+ \u65E0\u5E38\u9A7B\u6587\u5B57\uFF1B\u89E6\u6478\u7AEF\u540C\u5C4F\u4E24\u533A\u3001\u65B9\u5411\u53EF\u7531 HUD \u5207\u6362\uFF0C\n   \u628A\u684C\u9762\u9760 hover \u5B8C\u6210\u7684\u64CD\u4F5C\u6362\u6210\u53EF\u70B9\u6309\u7684\u5E38\u9A7B\u63A7\u4EF6\uFF08\u4E0A\u4E0B\u6587\u6761 / \u505C\u9760\u6761\uFF09\u3002\n   \u6807\u7B7E\u9875\uFF08.tabbar\uFF09\u5DF2\u5728 0.9.13 \u5220\u9664 \u2014\u2014 \u4E24\u533A\u540C\u5C4F\u540E\u5B83\u53EA\u6539\u4E00\u4E2A\u6CA1\u6709\u6D88\u8D39\u8005\u7684 data-view \u5C5E\u6027\u3002\n   --------------------------------------------------------------------------- */\n.tbpanel,.toast{display:none}\n/* \u5168\u5C40\u9876\u680F\uFF082026-11-14 \u8D77\uFF09\uFF1A\u64A4\u9500 / \u91CD\u505A / \u5E03\u5C40 / \u751F\u6210\u5D4C\u5165\u4EE3\u7801\uFF08\u8FDE\u7EBF 0.9.17 \u8D77\u79FB\u5230\u5E95\u90E8\u52A8\u4F5C\u884C\uFF09\u3002\n   \u8FD9\u4E9B\u52A8\u4F5C\u4E0E\u300C\u753B\u5E03\u5185\u5BB9\u300D\u65E0\u5173\uFF0C\u5DE6\u53F3\u5206\u680F\u65F6\u5FC5\u987B\u6A2A\u8DE8\u4E24\u680F \u2014\u2014 \u539F\u5148\u5B83\u4EEC\u753B\u5728 SVG \u91CC\uFF0C\n   \u53EA\u80FD\u5728\u6CE2\u5F62\u533A\u51FA\u73B0\uFF0C\u800C\u4E14\u8981\u9760 translate \u8865\u507F\u8DDF\u968F\u6EDA\u52A8\u3002 */\n.topbar{display:flex;align-items:center;gap:6px;flex:0 0 40px;padding:0 10px;\n  background:var(--panel);border-bottom:1px solid var(--line);user-select:none}\n.topbar .hudBtn{min-width:32px;height:26px;padding:0 7px;border:1px solid var(--line);\n  border-radius:6px;background:var(--src-bg);color:var(--ink);cursor:pointer;\n  display:grid;place-items:center;font:600 14px/1 var(--sans)}\n.topbar .hudBtn:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}\n.topbar .hudBtn[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}\n.topbar .hudBtn.dim,.topbar .hudBtn:disabled{opacity:.4;cursor:default}\n/* \u89C6\u56FE\u5207\u6362\u952E\uFF1A\u7B26\u53F7**\u539F\u6837\u590D\u7528**\u65E7\u4E09\u6BB5\u63A7\u4EF6\u91CC\u4EE3\u8868\u4EE3\u7801\u7684\u90A3\u4E2A { }\uFF0C\u5B57\u53F7/\u5B57\u4F53\u4E0E hudBtn \u5BF9\u9F50\uFF1B\n   \u9760**\u989C\u8272**\u8868\u8FBE\u72B6\u6001 \u2014\u2014 \u7070 = \u4EE3\u7801\u533A\u5173\u7740\uFF0C\u4EAE = \u5F00\u7740\u3002\n   \u671F\u95F4\u8BD5\u8FC7\u65B9\u6CE2/\u5206\u680F\u4E24\u79CD\u81EA\u7ED8 SVG\uFF1A16px \u4E0B\u7EC6\u8282\u8BA4\u4E0D\u51FA\uFF0C\u4E14\u56FE\u6807\u6765\u56DE\u6362\u4F1A\u8BA9\u4EBA\u4EE5\u4E3A\u6309\u94AE\u4E5F\u6362\u4E86\u3002 */\n.topbar .viewBtn{min-width:38px;height:26px;padding:0 8px;border:1px solid var(--line);border-radius:6px;\n  background:var(--src-bg);color:var(--muted);cursor:pointer;font:600 14px/1 var(--sans)}\n.topbar .viewBtn:hover{color:var(--accent);border-color:var(--accent)}\n.topbar .viewBtn.sel{color:var(--accent);border-color:var(--accent);background:var(--accent-bg)}\n.is-touch .topbar .viewBtn{min-width:44px;height:44px;font-size:18px}\n/* \u4E24\u89C6\u56FE\u663E\u9690\uFF080.25.0 \u53D6\u6D88\u300C\u53EA\u4EE3\u7801\u300D\uFF09\uFF1Adata-view \u7531\u72B6\u6001\u5C42\u5199\u5230 .app \u4E0A\u3002\n   both = \u4E24\u4E2A pane \u90FD\u5728\uFF1Bdiagram = \u53EA\u7559\u6CE2\u5F62\u5E76\u628A grid \u6536\u6210\u5355\u683C\u3002\n   \u7528 display:none \u800C\u975E visibility\uFF0C\u8BA9\u9690\u85CF\u7684 textarea \u4E0D\u53C2\u4E0E Tab \u5E8F\u5217\u3001\u4E5F\u4E0D\u5403\u7126\u70B9\u3002 */\n.app[data-view="diagram"]{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr)}\n.app[data-view="diagram"] .pane.src{display:none}\n/* \u53EA\u8BFB\u6001\u6CA1\u6709\u4EFB\u4F55\u5168\u5C40\u52A8\u4F5C \u2192 \u9876\u680F\u6574\u6761\u4E0D\u5360\u4F4D\uFF08\u5426\u5219\u5361\u7247 iframe \u4F1A\u767D\u767D\u9AD8 40px\uFF09 */\n.topbar:empty{display:none}\n.is-touch{--dock-acts:61px;--dock-chars:56px}\n.is-touch .topbar{flex:0 0 54px;padding:0 8px;gap:8px}\n.is-touch .topbar .hudBtn{min-width:44px;height:44px;padding:0;font-size:18px;border-radius:10px}\n.is-touch body{overflow:hidden}\n.is-touch .app{flex:1 1 auto;height:auto;min-height:0}\n/* \u89E6\u6478\u7AEF\u4E0D\u518D\u5206\u300C\u6E90\u7801\u9875 / \u65F6\u5E8F\u56FE\u9875\u300D\u4E24\u9875\uFF1A\u4E24\u533A\u540C\u5C4F\uFF0C\u65B9\u5411\u540C HUD \u7684\u5207\u6362\u6309\u94AE */\n\n.is-touch .pane.src{border-right:0;border-bottom:0}\n.is-touch .gutter{font-size:13px;line-height:1.9}\n.is-touch .pane.src textarea{font-size:14px;line-height:1.9;padding-left:52px}\n/* \u753B\u5E03\u8FD9\u4E00\u5C42\uFF1A\u5141\u8BB8\u5355\u6307\u539F\u751F\u5E73\u79FB\u4E0E\u60EF\u6027\uFF08`pan-x pan-y`\uFF09\uFF0C**\u4F46\u628A\u300C\u6D4F\u89C8\u5668\u6574\u9875\u7F29\u653E\u300D\u5173\u6389**\u3002\n   \u8FD9\u4E00\u6761\u662F\u634F\u5408\u7F29\u653E\u7684\u524D\u63D0\uFF0C\u4E0D\u662F\u987A\u624B\u6539\u7684\uFF1A`manipulation` \u7684\u8BED\u4E49\u662F pan + **pinch-zoom**\uFF0C\n   \u4E24\u6307\u843D\u4E0B\u65F6\u6D4F\u89C8\u5668\u4F1A\u628A\u5B83\u5F53\u6210\u9875\u9762\u7F29\u653E\u5403\u6389 \u2014\u2014 CDP \u4E24\u6307\u62C9\u5F00\u5B9E\u6D4B\uFF1Apointercancel\xD72\u3001\n   visualViewport.scale 1\u21924.96\u3001\u7F16\u8F91\u5668\u8FDE\u4E00\u4E2A pointermove \u90FD\u6536\u4E0D\u5230\uFF08\u4E8E\u662F\u300C\u634F\u5408\u300D\u5728\u624B\u673A\u4E0A\n   \u4E00\u76F4\u662F\u300C\u8FDE\u9876\u680F\u548C\u6E90\u7801\u4E00\u8D77\u653E\u5927\u300D\uFF09\u3002\u6362\u6210 `pan-x pan-y` \u540E\u540C\u4E00\u624B\u52BF\u5B8C\u6574\u4EA4\u56DE\uFF0820 \u6B21 move\u3001\n   0 \u6B21 cancel\uFF09\uFF0C\u5355\u6307\u6EDA\u52A8\u4E0E\u60EF\u6027\u5206\u6BEB\u4E0D\u52A8 \u2014\u2014 \u8FD9\u662F\u552F\u4E00\u65E2\u62FF\u56DE\u634F\u5408\u3001\u53C8\u4E0D\u727A\u7272\u6EDA\u52A8\u624B\u611F\u7684\u7EC4\u5408\u3002\n   `none` \u4E0D\u884C\uFF1A\u5B83\u8FDE\u5355\u6307\u539F\u751F\u6EDA\u52A8\u4E00\u8D77\u5173\u6389\uFF0C\u90A3\u53EA\u9002\u5408\u4E0B\u9762\u76F8\u4F4D\u5C3A\u90A3\u79CD\u4E34\u65F6\u6A21\u5F0F\u3002 */\n.is-touch .svgwrap{touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}\n/* \u76F8\u4F4D\u6A21\u5F0F\u6253\u5F00\u65F6\uFF08\u90A3\u4E00\u884C\u53EF\u4EE5\u76F4\u63A5\u6293\u7740\u6CE2\u5F62\u6A2A\u5411\u62D6\uFF09\uFF0C\u753B\u5E03\u8FD9\u4E00\u5C42\u4E0D\u53C2\u4E0E\u539F\u751F\u5E73\u79FB\u3002\u539F\u56E0\u662F\u6D4F\u89C8\u5668\u7684\n   \u300C\u6EDA\u52A8\u4EF2\u88C1\u300D\uFF1A`touch-action:manipulation` \u5141\u8BB8\u5E73\u79FB\uFF0C\u4E00\u6B21\u6A2A\u5411\u62D6\u52A8\u4F1A\u88AB\u5224\u6210\u6EDA\u52A8\u5E76\u53D1\u51FA pointercancel \u2014\u2014\n   \u800C\u62D6\u52A8\u4E2D\u6BCF\u5E27\u90FD\u5728\u91CD\u7ED8\uFF0C\u6307\u9488\u6D41\u4E00\u65AD\uFF0C\u62D6\u52A8\u5C31\u53EA\u5269\u524D\u4E24\u5E27\uFF08Android \u5B9E\u6D4B\uFF1A\u6309\u4E0B\u53BB\u52A8\u4E00\u4E0B\uFF0C\u540E\u9762\u600E\u4E48\u62D6\u90FD\u4E0D\u52A8\uFF09\u3002\n   \u53EA\u5728\u76F8\u4F4D\u6A21\u5F0F\u671F\u95F4\u7981\u7528\uFF0C\u5176\u4F59\u65F6\u5019\u7167\u5E38\u6ED1\u52A8\u770B\u56FE\u3002\n   **\u4EE3\u4EF7\u4E0E\u8865\u507F**\uFF1A\u8FD9\u4E00\u6BB5\u624B\u52BF\u671F\u95F4\u539F\u751F\u6EDA\u52A8\u4E0D\u53EF\u7528\uFF0C\u6240\u4EE5\u300C\u62D6\u522B\u5904 = \u79FB\u52A8\u89C6\u56FE\u300D\u7531\u4EA4\u4E92\u5C42\u6309\u6307\u9488\u4F4D\u79FB\u624B\u5199\n   `scrollLeft / scrollTop`\uFF080.14.2\uFF0C\u89C1 interactions.js \u7684 tPan*\uFF09\uFF1B\u6A21\u5F0F\u4E00\u6536\u5C31\u64A4\u6389\u8FD9\u4E2A\u7C7B\uFF0C\u7ACB\u523B\u56DE\u5230\n   \u539F\u751F\u6EDA\u52A8 \u2014\u2014 \u8DDF\u624B\u3001\u56DE\u5F39\u3001\u6EDA\u52A8\u6761\u90FD\u8FD8\u5728\u3002 */\n.svgwrap.is-phase{touch-action:none}\n.is-touch .cellSel{stroke-width:2.4}\n/* \u4E0A\u4E0B\u6587\u6761\uFF1A\u684C\u9762\u4E0E\u89E6\u6478\u7AEF\u90FD\u9489\u5728**\u5E95\u90E8**\uFF08\u684C\u9762\u662F 34px \u65B9\u6309\u94AE\u7684\u6574\u884C\u6761\uFF0C\u89E6\u6478\u7AEF\u6362\u6210 44px \u5927\u6309\u94AE\uFF0C\n   \u89C4\u5219\u5728\u4E0B\u9762 .is-touch \u6BB5\u91CC\uFF09\u3002\u884C / \u5217\u52A8\u4F5C\u73B0\u5728\u53EA\u6709\u8FD9\u4E00\u6761\u901A\u9053 \u2014\u2014 \u753B\u5E03\u4E0A\u7684\u884C\u5C3E\u5DE5\u5177\u7EC4\u4E0E\u5217\u5934\n   \u6309\u94AE\u90FD\u5DF2\u64A4\u6389\uFF0C\u6240\u4EE5\u753B\u5E03\u53F3\u4FA7\u4E5F\u4E0D\u518D\u4E3A\u5B83\u4EEC\u7559\u4F4D\uFF08ACT_W = 0\uFF0C\u89C1 geometry.js\uFF09\u3002 */\n/* \u4E0A\u4E0B\u6587\u6761\uFF1A\u6574\u884C\u3001\u5B9A\u9AD8\u3001**\u7EDD\u4E0D\u6362\u884C**\u3002\u6362\u884C\u4F1A\u628A\u8FD9\u4E00\u6761\u6491\u6210\u4E24\u4E09\u6392 \u2014\u2014 \u505C\u9760\u533A\u867D\u7136\u6052\u9AD8\uFF0C\n   \u4F46\u6309\u94AE\u4F1A\u88AB\u81EA\u5DF1\u7684\u884C\u9AD8\u6324\u6389\uFF0844px \xD7 3 \u6392 > 61px\uFF09\u3002\u653E\u4E0D\u4E0B\u7684\u52A8\u4F5C\u4E0D\u518D\u6A2A\u5411\u6EDA\u52A8\uFF08\u6EDA\u52A8\u5728\u89E6\u6478\u7AEF\n   \u4F1A\u4E0E\u300C\u6ED1\u52A8\u770B\u753B\u5E03\u300D\u6DF7\u6DC6\uFF09\uFF0C\u800C\u662F\u6536\u8FDB\u300C\u22EF\u300D\uFF0C\u4E0E\u5B57\u7B26\u505C\u9760\u6761\u540C\u4E00\u5957\u6EA2\u51FA\u903B\u8F91\u3002 */\n.tbpanel.open{display:flex;flex-wrap:nowrap;gap:4px;padding:6px 8px;height:var(--dock-acts);\n  background:var(--panel);border-top:1px solid var(--line);overflow:hidden}\n/* \u52A8\u4F5C\u6309\u94AE\u7684\u7EDF\u4E00\u5C3A\u5BF8\uFF1A\u683C\u7EA7\uFF08\u505C\u9760\u6761\uFF09/ \u884C\u7EA7 / \u5217\u7EA7\u4E09\u8005\u5FC5\u987B\u4E00\u81F4 \u2014\u2014 \u5B83\u4EEC\u672C\u6765\u5C31\u5171\u7528\u540C\u4E00\u6279\n   24 \u5355\u4F4D\u56FE\u6807\uFF0C\u5C3A\u5BF8/\u5706\u89D2/\u63CF\u8FB9\u5404\u5199\u4E00\u4EFD\u5C31\u4F1A\u50CF\u73B0\u5728\u8FD9\u6837\u300C\u770B\u7740\u90FD\u5DEE\u4E0D\u591A\u3001\u653E\u4E00\u8D77\u5374\u5BF9\u4E0D\u9F50\u300D\u3002\n   \u684C\u9762 32\xD732\uFF08\u505C\u9760\u6761\u5185\u5BB9\u9AD8\u6B63\u597D 32\uFF0C\u4E0D\u6EA2\u51FA\uFF09\u3001\u89E6\u6478 44\xD744\uFF08\u89E6\u5C4F\u6700\u5C0F\u547D\u4E2D\u533A\uFF09\u3002 */\n:is(.tbpanel,.tbmore) button.ctxbtn{width:32px;height:32px;min-width:32px;padding:0;border:1px solid var(--line);\n  border-radius:6px;background:var(--src-bg);color:var(--ink);display:grid;place-items:center;\n  cursor:pointer}\n/* \u56FE\u6807 24px\uFF0832\xD732 \u21D2 \u504F\u79FB 4px\uFF09+ 2px \u63CF\u8FB9 + \u5706\u7AEF\u70B9\u3002\u7AEF\u70B9\u5FC5\u987B\u4E0E\u89E6\u6478\u7AEF\u4E00\u81F4\uFF1A\n   \u684C\u9762\u4E0D\u5199\u5C31\u662F butt/miter\uFF0C\u540C\u4E00\u4E2A\u56FE\u6807\u5728\u4E24\u7AEF\u7684\u62D0\u89D2\u5F62\u72B6\u4F1A\u4E0D\u540C\uFF08\u7528\u6237\u80FD\u770B\u51FA\u300C\u98CE\u683C\u4E0D\u7EDF\u4E00\u300D\uFF09\u3002\n   \u4E3A\u4EC0\u4E48\u5FC5\u987B 24/2\uFF1A\u89C1\u4E0A\u9762\u683C\u7EA7\u52A8\u4F5C\u90A3\u6BB5\u6CE8\u91CA \u2014\u2014 \u540C\u4E00\u6279 24 \u5355\u4F4D\u56FE\u6807\uFF0C\u53EA\u6709 1:1 \u624D\u6E05\u6670\u3002 */\n:is(.tbpanel,.tbmore) button.ctxbtn svg{width:24px;height:24px;fill:none;stroke:currentColor;\n  stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\n:is(.tbpanel,.tbmore) button.ctxbtn:hover{border-color:var(--accent);color:var(--accent)}\n:is(.tbpanel,.tbmore) button.ctxbtn[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}\n.is-touch .tbpanel{display:none}\n.is-touch .tbpanel.open{display:flex;flex-wrap:nowrap;gap:8px;padding:8px;overflow:hidden}\n.is-touch .tbpanel button{min-height:44px;min-width:86px;padding:6px 10px;\n  border:1px solid var(--line);border-radius:10px;background:var(--src-bg);color:var(--ink);\n  font:13px var(--sans);touch-action:manipulation}\n/* \u4E0A\u4E0B\u6587\u56FE\u6807\u6761\uFF1A44\xD744 \u65B9\u5757 + \u5C45\u4E2D\u7EBF\u6761\u56FE\u6807\uFF1B\u56FE\u6807\u753B\u7684\u662F\u300C\u88AB\u64CD\u4F5C\u5BF9\u8C61\u7684\u7F29\u7565\u56FE\u300D */\n.is-touch :is(.tbpanel,.tbmore) button.ctxbtn{min-width:44px;width:44px;height:44px;min-height:44px;padding:0;\n  display:flex;align-items:center;justify-content:center}\n.is-touch :is(.tbpanel,.tbmore) button.ctxbtn svg{width:24px;height:24px;fill:none;stroke:currentColor;\n  stroke-width:2}\n.is-touch :is(.tbpanel,.tbmore) button.ctxbtn:active{background:var(--accent-bg);border-color:var(--accent);color:var(--accent)}\n.is-touch :is(.tbpanel,.tbmore) button.ctxbtn[aria-pressed="true"]{background:var(--accent-bg);border-color:var(--accent);color:var(--accent)}\n.is-touch .tbpanel button:active{background:var(--accent-bg);border-color:var(--accent)}\n.is-touch .toast{display:none;position:fixed;left:50%;bottom:calc(12px + var(--toast-lift,0px));transform:translateX(-50%);z-index:30;\n  max-width:88vw;padding:8px 14px;border-radius:10px;background:var(--ink);color:var(--bg);\n  font:12px/1.5 var(--sans);box-shadow:0 4px 16px rgba(0,0,0,.22);pointer-events:none}\n.is-touch .toast.show{display:block}\n/* \u5B57\u7B26\u505C\u9760\u6761\uFF1A\u9009\u4E2D\u683C\u624D\u51FA\u73B0\uFF0C\u9489\u5728\u5361\u7247\u5E95\u90E8\uFF08\u975E\u5D4C\u5165\u65F6\u8BA9\u5F00 60px \u7684\u64CD\u4F5C\u680F\uFF09\u3002\n   \u4E0E\u65E7\u7248\u300C\u753B\u5728 SVG \u91CC\u518D\u968F\u6EDA\u52A8\u53CD\u5411\u4F4D\u79FB\u300D\u7684\u5B57\u7B26\u6761\u76F8\u6BD4\uFF0C\u5B83\u4E0D\u968F\u753B\u5E03\u6EDA\u52A8\u3001\u4E0D\u76D6\u6CE2\u5F62\uFF0C\n   \u547D\u4E2D\u533A\u7A33\u5B9A\u5728 44px \u2014\u2014 \u624B\u673A\u4E0A\u4E00\u6839\u624B\u6307\u4E0D\u4F1A\u88AB\u5B83\u5E26\u7740\u8DD1\u3002 */\n.chardock{display:none}\n/* \u684C\u9762\uFF1A\u5B57\u7B26\u505C\u9760\u6761\u4E0E\u89E6\u6478\u7AEF\u662F**\u540C\u4E00\u4E2A\u7EC4\u4EF6**\uFF08#chardock / .chipbtn\uFF09\uFF0C\u53EA\u662F\u6446\u653E\u4E0E\u5C3A\u5BF8\n   \u6309\u6307\u9488\u5B9A\u3002\u539F\u5148\u684C\u9762\u5728 SVG \u91CC\u53E6\u753B\u4E00\u6761 23 \u9897\u7684 charChips \u2014\u2014 \u4E24\u5957\u6E32\u67D3\u3001\u4E24\u5957\u5E03\u5C40\u3001\n   \u4E24\u5957\u70B9\u51FB\uFF0C\u8FD8\u6709\u4E00\u6BB5\u300C\u6EDA\u52A8\u65F6\u53CD\u5411\u4F4D\u79FB\u628A chips \u9489\u56DE\u53EF\u89C6\u533A\u300D\u7684\u8865\u507F\u3002\u73B0\u5728\u4E00\u5957\u3002\n   \u684C\u9762\u653E\u5F97\u4E0B 23 \u9897\u5C31\u5168\u5E73\u94FA\uFF08\u4E0D\u6298\u53E0\uFF09\uFF0C\u89E6\u6478\u7AEF 4 \u9897 + \u22EF\uFF0C\u7531 JS \u6309 TOUCH \u51B3\u5B9A\u6570\u91CF\u3002 */\n\n/* \u6EA2\u51FA\u533A\uFF080.25.0\uFF09\uFF1A\u4E24\u6761\u6309\u94AE\u6761\u5404\u81EA\u7684\u300C\u66F4\u591A\u300D\u90FD\u6302\u5728**\u4E0B\u65B9**\uFF0C\u5C55\u5F00\u65F6\u5360\u4F4D\u3002\n   \u65E7\u5B9E\u73B0\u9489\u5728\u6309\u94AE\u6761\u4E0A\u6CBF\u5F80\u4E0A\u5F39\uFF0C\u5361\u7247\u53EA\u6709 200px \u9AD8\u65F6\u4F1A\u628A\u753B\u5E03\u6574\u4E2A\u76D6\u4F4F\uFF08\u6CE2\u5F62\u70B9\u4E0D\u7740\u3001\u62D6\u4E0D\u52A8\uFF09\u3002\n   \u73B0\u5728\u5B83\u53C2\u4E0E\u5E03\u5C40\uFF1A\u5728\u6D41\u5185\u6B63\u5E38\u6491\u5F00 dockzone\uFF0C\u753B\u5E03\u968F\u4E4B\u53D8\u77EE \u2014\u2014 \u6C38\u8FDC\u4E0D\u4F1A\u76D6\u4F4F\u6CE2\u5F62\u3002 */\n.charmore,.tbmore{display:none}\n.charmore.open,.tbmore.open{display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;\n  padding:6px 8px;max-height:40vh;overflow:auto;\n  background:var(--panel);border-top:1px solid var(--line)}\n.tbmore.open{gap:8px;padding:8px}\n/* \u5927\u89C6\u56FE\uFF08\u6574\u9875\u7F16\u8F91\u5668 / \u5168\u5C4F\uFF09\uFF1A\u6EA2\u51FA\u533A\u6539\u6210**\u5411\u4E0A\u6D6E\u51FA**\uFF0C\u4E0D\u5360\u5E03\u5C40\u3002\n   \u8FD9\u65F6\u753B\u5E03\u5F88\u5927\uFF0C\u76D6\u4F4F\u5E95\u90E8\u4E00\u5C0F\u6761\u8FDC\u597D\u8FC7\u300C\u6574\u5757\u754C\u9762\u91CD\u6392 + \u56FE\u91CD\u65B0\u7F29\u653E\u300D\u2014\u2014\n   \u5C55\u5F00/\u6536\u8D77\u53EA\u89E6\u53D1\u4E00\u6B21\u5408\u6210\uFF0C\u5C3A\u5BF8\u4E00\u4E2A\u50CF\u7D20\u90FD\u4E0D\u53D8\u3002\u5D4C\u5165\u5361\u7247\u4ECD\u8D70\u4E0A\u9762\u7684\u4E0B\u6302\u5360\u4F4D\u3002 */\n.dockzone.more-up .charmore.open,.dockzone.more-up .tbmore.open{position:absolute;left:0;right:0;bottom:100%;\n  z-index:23;max-height:40vh;box-shadow:0 -4px 14px rgba(0,0,0,.12)}\n.chardock.open{display:flex;\n  align-items:center;justify-content:flex-start;gap:4px;padding:4px 8px;height:var(--dock-chars);\n  background:var(--panel);border-top:1px solid var(--line);user-select:none;\n  /* 23 \u9897 \xD7 30px \u2248 690\uFF1A\u7A84\u5361\u7247\uFF08\u5982 520 \u7684 iframe\uFF09\u653E\u4E0D\u4E0B\u65F6\u5FC5\u987B\u6A2A\u5411\u6EDA\u52A8\uFF0C\n     \u4E0D\u80FD\u5C45\u4E2D\u6EA2\u51FA \u2014\u2014 \u5C45\u4E2D\u4F1A\u8BA9\u7B2C\u4E00\u9897\u8DD1\u5230\u8D1F\u5750\u6807\uFF0C\u7528\u6237\u770B\u4E0D\u5230\u4E5F\u70B9\u4E0D\u5230\u3002 */\n  overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}\n/* \u5B57\u7B26\u6309\u94AE\u7684\u57FA\u7840\u6837\u5F0F\uFF1A\u5B57\u5F62\u6309 30\xD728 \u7684\u5185\u8054\u7F51\u683C\u753B\uFF0C\u89E6\u6478\u7AEF\u518D\u653E\u5927\u5230 48\xD744\u3002 */\n:is(.chardock,.charmore) .chipbtn{position:relative;flex:0 0 30px;width:30px;height:28px;min-width:30px;padding:0;\n  border:1px solid var(--line);border-radius:6px;background:var(--src-bg);color:var(--ink);overflow:hidden}\n:is(.chardock,.charmore) .chipbtn:not(.act) svg{position:absolute;inset:0;width:100%;height:100%;\n  --wave-ink:var(--muted);opacity:.85;pointer-events:none}\n:is(.chardock,.charmore) .chipbtn span{position:relative;font:600 12px var(--mono);\n  text-shadow:0 0 3px var(--panel),0 0 3px var(--panel)}\n/* \u505C\u9760\u6761\u5DE6\u4FA7\u7684\u4E09\u4E2A\u683C\u7EA7\u52A8\u4F5C\uFF08label / node / link\uFF09\uFF1A\u4E0E\u5B57\u7B26\u540C\u5C3A\u5BF8\uFF0C\u9760\u4E00\u6761\u7AD6\u7EBF\u5206\u5F00\u3002\n   \u5B83\u4EEC\u753B\u7684\u662F 24\xD724 \u7F51\u683C\u7684 stroke \u56FE\uFF0C\u4E0D\u662F\u6CE2\u5F62\u9884\u89C8\uFF0C\u6240\u4EE5\u4E0D\u5957\u5B57\u7B26\u90A3\u5957\u914D\u8272\u4E0E\u7F29\u653E\u3002\n\n   \u26A0\uFE0F **\u57FA\u7840\u89C4\u5219\u5FC5\u987B\u628A\u5B83\u6392\u9664\u5728\u5916**\uFF08\u4E0A\u9762\u90A3\u6761 `:not(.act)`\uFF09\u3002\u8FD9\u4E2A\u4F4D\u7F6E\u7684\u5751\u8E29\u8FC7\u4E24\u6B21\uFF1A\n   \xB7 0.18.0\uFF1A`.chipbtn svg{inset:0}` \u4E0E\u8FD9\u91CC\u540C\u7279\u5F02\u6027\u3001\u5199\u5728\u540E\u9762\uFF0C\u628A `left/top:50%` \u91CD\u7F6E\u6210 auto\uFF0C\n     \u56FE\u6807\u88AB translate \u63A8\u51FA\u6309\u94AE\u518D\u88AB `overflow:hidden` \u88C1\u6389\uFF08\u5B9E\u6D4B\u6309\u94AE 30\xD728\u3001svg 17\xD717\u3001dx=-7.5\uFF09\uFF1B\n   \xB7 0.19.3\uFF1A\u540C\u4E0A\u4F46\u53D1\u751F\u5728\u89E6\u6478\u7AEF \u2014\u2014 `.is-touch` \u90A3\u6761\u53C8\u628A `inset:0` \u76D6\u56DE\u6765\uFF0C\u504F\u79FB -11,-11\uFF0C\n     44px \u6309\u94AE\u91CC\u53EA\u5269\u5DE6\u4E0A\u89D2\u4E00\u6761\u7F1D\u3002\n   \u4E24\u6B21\u7684\u6559\u8BAD\u662F\u540C\u4E00\u6761\uFF1A**\u522B\u9760\u58F0\u660E\u987A\u5E8F\u6216 `!important` \u62A2\uFF0C\u76F4\u63A5\u8BA9\u57FA\u7840\u89C4\u5219\u4E0D\u5339\u914D\u5B83\u3002**\n\n   \u26A0\uFE0F \u5C3A\u5BF8\u4E0E\u63CF\u8FB9\u4E5F\u662F\u529F\u80FD\u6027\u7684\uFF1A24 \u5355\u4F4D\u7684\u56FE\u6807\u5FC5\u987B **24px 1:1 \u6E32\u67D3 + 2px \u63CF\u8FB9**\u3002\u7F29\u6210 17px \u5C31\u662F\n   0.708 \u500D\uFF0C1px \u63CF\u8FB9\u53D8\u6210\u4E9A\u50CF\u7D20\u3001\u4E2D\u5FC3\u8FD8\u843D\u5728\u534A\u50CF\u7D20\u4E0A \u2014\u2014 \u6297\u952F\u9F7F\u628A\u7EBF\u644A\u5230\u4E24\u4E2A\u50CF\u7D20\uFF0C1 \u500D\u5C4F\u4E0A\n   \u659C\u8FB9\u65AD\u53E3\u3001\u5706\u73AF\u53D1\u7070\uFF080.19.3 \u7528\u6237\u5B9E\u6D4B\u300C\u5934\u4E24\u4E2A\u6309\u94AE\u56FE\u6807\u5F02\u5E38\u300D\uFF1B2 \u500D\u5C4F\u548C\u7F29\u7565\u56FE\u4E0A\u90FD\u770B\u4E0D\u51FA\u6765\uFF09\u3002 */\n/* \u684C\u9762\u5C3A\u5BF8\u4E0E\u884C/\u5217\u52A8\u4F5C\u6309\u94AE\u5BF9\u9F50\uFF0832\xD732\uFF09\uFF1A\u4E09\u8005\u5171\u7528\u540C\u4E00\u6279 24 \u5355\u4F4D\u56FE\u6807\uFF0C\u6309\u94AE\u4E5F\u5FC5\u987B\u540C\u5927\u3002\n   \u505C\u9760\u6761\u5185\u5BB9\u9AD8\u6070\u597D 32\uFF08--dock-chars 40 \u2212 \u4E0A\u4E0B padding 4\xD72\uFF09\uFF0C\u4E0D\u4F1A\u6EA2\u51FA\u3002\n   \u7AEF\u70B9\u540C\u6837\u7528 round \u2014\u2014 \u4E0E\u4E0A\u4E0B\u6587\u6761\u3001\u89E6\u6478\u7AEF\u4FDD\u6301\u540C\u4E00\u5957\u753B\u7B14\u3002 */\n:is(.chardock,.charmore) .chipbtn.act{flex:0 0 32px;width:32px;min-width:32px;height:32px}\n:is(.chardock,.charmore) .chipbtn.act svg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);\n  width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;\n  stroke-linecap:round;stroke-linejoin:round}\n/* \u89E6\u6478\u7AEF\u8FD9\u4E09\u4E2A\u6309\u94AE\u6536\u5230 44\uFF08\u4E0D\u8DDF\u5B57\u7B26\u7684 48\uFF09\uFF1A320px \u5361\u7247\u91CC\u7701\u4E0B\u7684 12px \u6B63\u597D\u80FD\u591A\u6446\u4E00\u9897\u5B57\u7B26\u3002\n   \u56FE\u6807\u5C3A\u5BF8\u6CBF\u7528\u4E0A\u9762\u7684 24\uFF0C\u4E0D\u53E6\u8BBE \u2014\u2014 \u591A\u51FA\u6765\u7684\u7A7A\u95F4\u7559\u7ED9\u547D\u4E2D\u533A\u3002 */\n.is-touch :is(.chardock,.charmore) .chipbtn.act{flex:0 0 44px;width:44px;min-width:44px;height:44px}\n.docksep{flex:0 0 1px;align-self:stretch;margin:6px 6px;background:var(--line)}\n:is(.chardock,.charmore) .chipbtn.on{border-color:var(--accent);background:var(--accent-bg)}\n:is(.chardock,.charmore) .chipbtn.on svg{--wave-ink:var(--accent);opacity:1}\n:is(.chardock,.charmore) .chipbtn.on span{color:var(--accent)}\n:is(.chardock,.charmore) .chipbtn:hover{border-color:var(--accent)}\n/* \u300C\u22EF\u300D\uFF1A\u4E0E\u5B57\u7B26\u540C\u5C3A\u5BF8\uFF0C\u53EA\u663E\u793A\u4E09\u4E2A\u70B9\uFF1B\u5C55\u5F00\u65F6\u70B9\u4EAE\u3002 */\n:is(.chardock,.charmore) .chipbtn.more span,:is(.tbpanel,.tbmore) button.ctxbtn.more span{font:600 15px var(--sans);color:var(--muted);line-height:1}\n:is(.chardock,.charmore) .chipbtn.more.on,:is(.tbpanel,.tbmore) button.ctxbtn.more.on{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}\n.is-touch .chardock.open{display:flex;\n  align-items:center;gap:6px;padding:6px 8px;\n  background:var(--panel);border-top:1px solid var(--line);\n  overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;\n  touch-action:pan-x;user-select:none}\n/* \u89E6\u6478\u7AEF\u53EA\u8986\u76D6\u300C\u4E0E\u684C\u9762\u4E0D\u540C\u300D\u7684\u4E09\u9879\uFF1A\u5C3A\u5BF8\uFF0848\xD744 \u547D\u4E2D\u533A\uFF09\u3001\u5706\u89D2 10\u3001\u5B57\u53F7 15\u3002\n   \u5B9A\u4F4D\u3001\u914D\u8272\u4E0E\u9009\u4E2D\u6001\u7531\u4E0A\u9762\u7684\u57FA\u7840\u89C4\u5219\u7EDF\u4E00\u7ED9\u51FA\uFF0C\u4E0D\u518D\u91CD\u590D\u4E00\u904D\u3002 */\n.is-touch :is(.chardock,.charmore) .chipbtn{position:relative;flex:0 0 48px;\n  width:48px;height:44px;min-width:48px;padding:0;border:1px solid var(--line);border-radius:10px;\n  background:var(--src-bg);color:var(--ink);touch-action:manipulation;overflow:hidden}\n.is-touch :is(.chardock,.charmore) .chipbtn span{position:relative;\n  font:600 15px var(--mono);text-shadow:0 0 3px var(--panel),0 0 3px var(--panel)}\n.is-touch :is(.chardock,.charmore) .chipbtn:active{background:var(--accent-bg);border-color:var(--accent)}\n/* \u53F3\u8FB9\u7F18\u6DE1\u51FA\uFF1A\u63D0\u793A\u8FD9\u6392\u8FD8\u80FD\u6A2A\u5411\u6ED1\uFF0823 \u4E2A\u5B57\u7B26\u4E00\u6392\u653E\u4E0D\u4E0B\uFF09 */\n.is-touch .chardock.open::after{content:"";position:sticky;right:0;flex:0 0 18px;\n  align-self:stretch;margin-left:-18px;\n  background:linear-gradient(to right,rgba(0,0,0,0),var(--panel));pointer-events:none}\n/* \u9996\u5C4F\u624B\u52BF\u5F15\u5BFC\uFF1A\u6307\u5C16\u4ECE\u53F3\u4E0B\u6ED1\u5230\u683C\u5B50 \u2192 \u70B9\u4E00\u4E0B + \u8F7B\u6D9F\u6F2A \u2192 \u518D\u70B9\u4E00\u4E0B\uFF08\u53CC\u6572\u8FDB\u5C31\u5730\u7F16\u8F91\uFF09\u3002\n   \u753B\u5728\u9875\u9762\u56FA\u5B9A\u5C42\u4E0A\uFF0C\u64AD\u5B8C\u7531 JS \u79FB\u9664\uFF1B\u4E0D\u5360\u753B\u5E03\u3001\u4E0D\u8FDB\u6CE2\u5F62\u5C42\u3001\u4E0D\u5199\u4EFB\u4F55\u6587\u5B57\u3002 */\n.gesture{position:fixed;z-index:35;width:0;height:0;pointer-events:none}\n.gesture i{position:absolute;display:block;border-radius:50%}\n.gesture .finger{width:22px;height:22px;margin:-11px 0 0 -11px;background:var(--accent);\n  border:2px solid var(--bg);box-shadow:0 2px 8px rgba(0,0,0,.3);animation:gFinger 2.2s ease-out forwards}\n.gesture .ring{width:40px;height:40px;margin:-20px 0 0 -20px;border:2.5px solid var(--accent);opacity:0}\n.gesture .r1{animation:gRing .7s ease-out .55s forwards}\n.gesture .r2{animation:gRing .7s ease-out 1s forwards}\n@keyframes gFinger{\n  0%{transform:translate(24px,32px) scale(1);opacity:0}\n  8%{transform:translate(24px,32px) scale(1);opacity:.95}\n  22%{transform:translate(0,0) scale(1)}\n  30%{transform:translate(0,0) scale(.78)}\n  38%{transform:translate(0,0) scale(1)}\n  48%{transform:translate(0,0) scale(.78)}\n  56%{transform:translate(0,0) scale(1)}\n  70%{transform:translate(0,0) scale(1);opacity:.95}\n  100%{transform:translate(0,0) scale(1);opacity:0}\n}\n@keyframes gRing{\n  0%{transform:scale(.35);opacity:1}\n  100%{transform:scale(1.7);opacity:0}\n}\n.is-touch .errdot{width:12px;height:12px;top:12px;right:12px}\n.is-touch .inline-edit{font-size:16px;height:100%}\n\n/* \u5C0A\u91CD\u7CFB\u7EDF\u7684\u300C\u51CF\u5C11\u52A8\u6001\u6548\u679C\u300D\u504F\u597D\u3002\n   \u8FD9\u91CC\u53EA\u5173\u6389**\u81EA\u52A8\u64AD\u653E**\u7684\u88C5\u9970\u52A8\u6548\uFF0C\u4E0D\u78B0\u4EA4\u4E92\u53CD\u9988\uFF1A\n   \xB7 \u9996\u5C4F\u624B\u52BF\u5F15\u5BFC\uFF08gFinger 2.2s + \u4E24\u5708\u6269\u6563\uFF09\u662F\u6253\u5F00\u9875\u9762\u81EA\u5DF1\u5C31\u5F00\u59CB\u64AD\u7684\uFF0C\n     \u5BF9\u524D\u5EAD\u654F\u611F\u7684\u4EBA\u4E0D\u53CB\u597D\uFF08WCAG 2.2.2 \u8981\u6C42\u8FD9\u7C7B\u52A8\u6548\u53EF\u505C\uFF09\u2014\u2014 \u76F4\u63A5\u4E0D\u64AD\u3002\n     \u5B83\u53EA\u662F\u63D0\u793A\u300C\u70B9\u683C\u5B50\u53EF\u4EE5\u7F16\u8F91\u300D\uFF0C\u8282\u70B9\u5DF2\u88AB JS \u5728 2.4s \u540E\u81EA\u884C\u79FB\u9664\uFF0C\u9690\u85CF\u4E0D\u5F71\u54CD\u4EFB\u4F55\u903B\u8F91\u3002\n   \xB7 \u9519\u8BEF\u7EA2\u70B9\u7684\u8109\u51B2\u662F\u7EAF\u88C5\u9970\uFF0C\u7EA2\u70B9\u672C\u8EAB\u5E38\u4EAE\u5C31\u591F\u4F20\u8FBE\u300C\u6709\u9519\u300D\u3002 */\n@media (prefers-reduced-motion:reduce){\n  .gesture{display:none}\n  .errdot.pulse{animation:none}\n}\n\n/* ---------------------------------------------------------------------------\n   \u7AD9\u70B9\u81EA\u7528\u53EA\u8BFB\u9884\u89C8\uFF08\u9996\u9875 logo \u4F4D\u3001\u6559\u7A0B\u9875\u793A\u4F8B\uFF0C\u7531 src/demo.js \u6E32\u67D3\uFF09\n   \u6309\u5BB9\u5668\u5BBD\u7B49\u6BD4\u7F29\u653E\u3001\u4E0D\u51FA\u6EDA\u52A8\u6761 \u2014\u2014 \u4E0E\u628A\u56FE\u5F53\u56FE\u7247\u770B\u7684\u8BC9\u6C42\u4E00\u81F4\u3002\n   --------------------------------------------------------------------------- */\n.tb-preview{position:relative;overflow:hidden}\n.tb-preview .svgwrap{overflow:hidden}\n.tb-preview .svgwrap svg{display:block;width:100%;height:auto;margin:0}\n\n/* \u9884\u89C8\u5361\u53F3\u4FA7\u4E0A\u89D2\u7684\u94C5\u7B14\uFF1A\u8DF3\u7F16\u8F91\u5668\u5E76\u5E26\u4E0A\u8FD9\u5F20\u56FE\u7684\u6E90\u7801\uFF08\u9884\u89C8\u672C\u8EAB\u4ECD\u53EA\u8BFB\uFF09\u3002\n   \u4E0E\u7F16\u8F91\u5668\u540C\u4E00\u5957\u914D\u8272\uFF0C\u660E\u6697\u4E3B\u9898\u81EA\u52A8\u8DDF\u968F\u3002 */\n.tb-edit{position:absolute;right:8px;top:8px;z-index:3;box-sizing:border-box;\n  width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;\n  border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--muted);\n  text-decoration:none;opacity:.9;transition:opacity .12s,color .12s,border-color .12s,background .12s}\n.tb-edit:hover,.tb-edit:focus-visible{opacity:1;color:var(--accent);border-color:var(--accent);background:var(--accent-bg);outline:none}\n.tb-edit svg{display:block;width:16px;height:16px}\n\n/* Plugin-only styles: the "inside a note" shapes the main stylesheet has no idea about.\n   The main stylesheet is scoped into the shadow root at build time (:root \u2192 :host,\n   body \u2192 .tb-root); these rules land there too, so nothing here can touch Obsidian\'s UI. */\n\n/* --- Shell: isolate the host and give the code block a stable box ----------------------- */\n.tb-shell {\n  position: relative;\n  display: block;\n  width: 100%;\n  border-radius: 6px;\n  overflow: hidden;\n  background: var(--background-primary, #fff);\n}\n.tb-root {\n  position: relative;\n  height: auto;\n  min-height: 0;\n}\n\n/* --- Preview: diagram only, no editing chrome ----------------------------------------- */\n.tb-root:not(.is-editing) .topbar,\n.tb-root:not(.is-editing) .dockzone,\n.tb-root:not(.is-editing) .pane.src {\n  display: none;\n}\n.tb-root:not(.is-editing) .app {\n  display: block;\n  height: auto;\n}\n.tb-root:not(.is-editing) .pane.diagram {\n  display: block;\n  height: auto;\n}\n.tb-root:not(.is-editing) .svgwrap {\n  height: auto;\n  overflow: visible;\n}\n.tb-root:not(.is-editing) .svgwrap svg {\n  display: block;\n  width: 100%;\n  height: auto;\n}\n\n/* --- Editing: a fixed viewport the editor can lay itself out in ------------------------ */\n.tb-root.is-editing {\n  height: min(72vh, 560px);\n  min-height: 380px;\n}\n.tb-root.is-editing .app {\n  display: grid;\n  flex: 1 1 auto;\n  min-height: 0;\n}\n\n/* --- Pencil / checkmark: same spot in both states ------------------------------------- */\n.tb-toggle {\n  position: absolute;\n  top: 6px;\n  right: 6px;\n  z-index: 40;\n  width: 30px;\n  height: 30px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0;\n  border: 1px solid var(--line);\n  border-radius: 6px;\n  background: var(--panel);\n  color: var(--muted);\n  cursor: pointer;\n  opacity: 0;\n  transition: opacity .12s ease;\n}\n.tb-shell:hover .tb-toggle,\n.tb-root.is-editing .tb-toggle,\n.tb-toggle:focus-visible {\n  opacity: 1;\n}\n.tb-toggle:hover {\n  color: var(--ink);\n  background: var(--hover);\n}\n.tb-toggle svg {\n  width: 16px;\n  height: 16px;\n  fill: none;\n  stroke: currentColor;\n  stroke-width: 1.8;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n}\n.tb-toggle .ico-done { display: none; }\n.tb-root.is-editing .tb-toggle .ico-done { display: block; }\n.tb-root.is-editing .tb-toggle .ico-edit { display: none; }\n\n/* --- Parse failure: one visible line, source untouched --------------------------------- */\n.tb-error {\n  padding: 8px 10px;\n  font: 12px/1.5 var(--sans);\n  color: var(--err);\n  background: var(--err-bg);\n  border-top: 1px solid var(--line);\n}\n';

// src/main.js
var LANG = "wavejson";
var MARKUP = [
  '<div class="tb-shell">',
  '  <div class="tb-root" data-tb="root">',
  '    <header class="topbar" data-tb="topbar"></header>',
  '    <div class="app" data-tb="app">',
  '      <div class="pane src">',
  '        <div class="gutter" data-tb="gutter" aria-hidden="true"></div>',
  '        <textarea data-tb="code" spellcheck="false" wrap="off" aria-label="WaveJSON source"></textarea>',
  '        <div class="errdot" data-tb="errdot" hidden></div>',
  "      </div>",
  '      <div class="pane diagram">',
  '        <div class="svgwrap" data-tb="wrap" aria-label="Timing diagram"></div>',
  '        <div class="dockzone" data-tb="dockzone">',
  '          <div class="tbpanel" data-tb="tbpanel"></div>',
  '          <div class="tbmore" data-tb="tbmore"></div>',
  '          <div class="chardock" data-tb="chardock"></div>',
  '          <div class="charmore" data-tb="charmore"></div>',
  "        </div>",
  "      </div>",
  "    </div>",
  '    <button type="button" class="tb-toggle" data-tb="toggle" aria-label="Edit timing diagram" aria-pressed="false">',
  '      <svg class="ico-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14.5 5.5l4 4"/></svg>',
  '      <svg class="ico-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l5 5L20 7"/></svg>',
  "    </button>",
  '    <div class="toast" data-tb="toast" aria-live="polite"></div>',
  '    <div class="tb-error" data-tb="err" role="status" hidden></div>',
  "  </div>",
  "</div>"
].join("\n");
var Cleanup = class extends import_obsidian.Component {
  constructor(fn) {
    super();
    this.fn = fn;
  }
  onunload() {
    if (this.fn) this.fn();
    this.fn = null;
  }
};
var Block = class {
  constructor(plugin, hostEl, mdCtx, source) {
    this.plugin = plugin;
    this.hostEl = hostEl;
    this.mdCtx = mdCtx;
    this.source = source;
    this.editing = false;
    this.ctx = null;
    this.offError = null;
    this.codeEl = null;
    this.rootEl = null;
  }
  mount() {
    const shell = document.createElement("div");
    const shadow = shell.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = tb_styles_default;
    shadow.appendChild(style);
    const holder = document.createElement("div");
    holder.innerHTML = MARKUP;
    while (holder.firstChild) shadow.appendChild(holder.firstChild);
    this.hostEl.textContent = "";
    this.hostEl.appendChild(shell);
    const q = (name) => shadow.querySelector('[data-tb="' + name + '"]');
    this.rootEl = q("root");
    this.codeEl = q("code");
    if (TOUCH) this.rootEl.classList.add("is-touch");
    this.ctx = createEditor({
      code: this.codeEl,
      wrap: q("wrap"),
      gutter: q("gutter"),
      errdot: q("errdot"),
      app: q("app"),
      isEmbed: false,
      initial: this.source,
      topbar: q("topbar"),
      tbpanel: q("tbpanel"),
      tbmore: q("tbmore"),
      chardock: q("chardock"),
      charmore: q("charmore"),
      toast: q("toast"),
      root: this.rootEl
    });
    const errEl = q("err");
    this.offError = this.ctx.onError((msg) => {
      if (!msg) {
        errEl.hidden = true;
        errEl.textContent = "";
        return;
      }
      errEl.textContent = msg;
      errEl.hidden = false;
    });
    if (this.ctx.lastError) {
      errEl.textContent = this.ctx.lastError;
      errEl.hidden = false;
    }
    this.ctx.setReadonly(true);
    this.ctx.setView("diagram");
    this.toggleEl = q("toggle");
    this.toggleEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.editing) this.stopEdit();
      else this.startEdit();
    });
    this.rootEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.editing) {
        e.preventDefault();
        this.stopEdit();
      }
    });
    const self = this;
    let lastW = 0;
    let raf = 0;
    this.ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0;
      if (!w || Math.abs(w - lastW) < 2) return;
      lastW = w;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (self.ctx) self.ctx.redraw();
      });
    });
    this.ro.observe(shell);
  }
  startEdit() {
    if (this.editing) return;
    this.editing = true;
    this.rootEl.classList.add("is-editing");
    this.toggleEl.setAttribute("aria-pressed", "true");
    this.ctx.setReadonly(false);
    this.ctx.setView("diagram");
    const ctx = this.ctx;
    requestAnimationFrame(() => {
      if (this.ctx === ctx && this.editing) ctx.redraw();
    });
    this.codeEl.focus();
  }
  stopEdit() {
    if (!this.editing) return;
    this.editing = false;
    this.rootEl.classList.remove("is-editing");
    this.toggleEl.setAttribute("aria-pressed", "false");
    this.ctx.setReadonly(true);
    this.ctx.setView("diagram");
    this.commit();
  }
  // Write the edited source back into the code block. Called once, on leaving editing.
  async commit() {
    const next = this.codeEl.value;
    if (next === this.source) return;
    const info = this.mdCtx.getSectionInfo(this.hostEl);
    const file = this.plugin.app.vault.getAbstractFileByPath(this.mdCtx.sourcePath);
    if (!info || !file) {
      new import_obsidian.Notice("WaveJSON: cannot locate this code block to save into.");
      this.source = next;
      return;
    }
    const body = next.replace(/\s+$/, "").split("\n");
    await this.plugin.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const start = info.lineStart;
      const end = info.lineEnd;
      if (lines[start] === void 0 || lines[end] === void 0) return data;
      return [].concat(lines.slice(0, start + 1), body, lines.slice(end)).join("\n");
    });
    this.source = next;
  }
  destroy() {
    if (this.ro) {
      try {
        this.ro.disconnect();
      } catch (e) {
      }
      this.ro = null;
    }
    if (this.offError) {
      try {
        this.offError();
      } catch (e) {
      }
      this.offError = null;
    }
    if (this.ctx && this.ctx.destroy) this.ctx.destroy();
    this.ctx = null;
  }
};
var WaveJSONPlugin = class extends import_obsidian.Plugin {
  onload() {
    this.registerMarkdownCodeBlockProcessor(LANG, (source, el, mdCtx) => {
      const block = new Block(this, el, mdCtx, source);
      try {
        block.mount();
      } catch (err) {
        el.textContent = "WaveJSON: " + (err && err.message ? err.message : String(err));
        console.error("[WaveJSON] mount failed", err);
        return;
      }
      mdCtx.addChild(new Cleanup(() => block.destroy()));
    });
  }
};
