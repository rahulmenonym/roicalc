
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/calc.svelte generated by Svelte v3.32.3 */

    const file = "src/calc.svelte";

    // (76:56) 
    function create_if_block_4(ctx) {
    	let div;
    	let t0;
    	let b0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let br;
    	let t6;
    	let b1;
    	let t7;
    	let t8;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b0 = element("b");
    			t1 = text(/*hpw*/ ctx[3]);
    			t2 = text(" hours and ");
    			t3 = text(/*mpw*/ ctx[4]);
    			t4 = text(" minutes");
    			t5 = text(" a week ");
    			br = element("br");
    			t6 = text("\n\t\t\tThat's around ");
    			b1 = element("b");
    			t7 = text(/*hpy*/ ctx[5]);
    			t8 = text(" hours a year!");
    			add_location(b0, file, 77, 23, 2173);
    			add_location(br, file, 77, 67, 2217);
    			add_location(b1, file, 78, 17, 2239);
    			attr_dev(div, "class", "result svelte-1vpamsl");
    			add_location(div, file, 76, 2, 2129);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b0);
    			append_dev(b0, t1);
    			append_dev(b0, t2);
    			append_dev(b0, t3);
    			append_dev(b0, t4);
    			append_dev(div, t5);
    			append_dev(div, br);
    			append_dev(div, t6);
    			append_dev(div, b1);
    			append_dev(b1, t7);
    			append_dev(div, t8);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hpw*/ 8) set_data_dev(t1, /*hpw*/ ctx[3]);
    			if (dirty & /*mpw*/ 16) set_data_dev(t3, /*mpw*/ ctx[4]);
    			if (dirty & /*hpy*/ 32) set_data_dev(t7, /*hpy*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(76:56) ",
    		ctx
    	});

    	return block;
    }

    // (71:57) 
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let b0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let br;
    	let t5;
    	let b1;
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b0 = element("b");
    			t1 = text("1 hour and ");
    			t2 = text(/*mpw*/ ctx[4]);
    			t3 = text(" minutes");
    			t4 = text(" a week ");
    			br = element("br");
    			t5 = text("\n\t\t\tThat's around ");
    			b1 = element("b");
    			t6 = text(/*hpy*/ ctx[5]);
    			t7 = text(" hours a year!");
    			add_location(b0, file, 72, 23, 1971);
    			add_location(br, file, 72, 62, 2010);
    			add_location(b1, file, 73, 17, 2032);
    			attr_dev(div, "class", "result svelte-1vpamsl");
    			add_location(div, file, 71, 2, 1926);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b0);
    			append_dev(b0, t1);
    			append_dev(b0, t2);
    			append_dev(b0, t3);
    			append_dev(div, t4);
    			append_dev(div, br);
    			append_dev(div, t5);
    			append_dev(div, b1);
    			append_dev(b1, t6);
    			append_dev(div, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*mpw*/ 16) set_data_dev(t2, /*mpw*/ ctx[4]);
    			if (dirty & /*hpy*/ 32) set_data_dev(t6, /*hpy*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(71:57) ",
    		ctx
    	});

    	return block;
    }

    // (66:57) 
    function create_if_block_2(ctx) {
    	let div;
    	let t0;
    	let b0;
    	let t1;
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let b1;
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b0 = element("b");
    			t1 = text(/*mpw*/ ctx[4]);
    			t2 = text(" minutes");
    			t3 = text(" a week ");
    			br = element("br");
    			t4 = text("\n\t\t\tThat's around ");
    			b1 = element("b");
    			t5 = text(/*hpy*/ ctx[5]);
    			t6 = text(" hours a year!");
    			add_location(b0, file, 67, 23, 1778);
    			add_location(br, file, 67, 51, 1806);
    			add_location(b1, file, 68, 17, 1828);
    			attr_dev(div, "class", "result svelte-1vpamsl");
    			add_location(div, file, 66, 2, 1733);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b0);
    			append_dev(b0, t1);
    			append_dev(b0, t2);
    			append_dev(div, t3);
    			append_dev(div, br);
    			append_dev(div, t4);
    			append_dev(div, b1);
    			append_dev(b1, t5);
    			append_dev(div, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*mpw*/ 16) set_data_dev(t1, /*mpw*/ ctx[4]);
    			if (dirty & /*hpy*/ 32) set_data_dev(t5, /*hpy*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(66:57) ",
    		ctx
    	});

    	return block;
    }

    // (61:47) 
    function create_if_block_1(ctx) {
    	let div;
    	let t0;
    	let b0;
    	let t1;
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let b1;
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b0 = element("b");
    			t1 = text(/*hpw*/ ctx[3]);
    			t2 = text(" hours");
    			t3 = text(" a week ");
    			br = element("br");
    			t4 = text("\n\t\t\tThat's around ");
    			b1 = element("b");
    			t5 = text(/*hpy*/ ctx[5]);
    			t6 = text(" hours a year!");
    			add_location(b0, file, 62, 23, 1587);
    			add_location(br, file, 62, 49, 1613);
    			add_location(b1, file, 63, 17, 1635);
    			attr_dev(div, "class", "result svelte-1vpamsl");
    			add_location(div, file, 61, 2, 1543);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b0);
    			append_dev(b0, t1);
    			append_dev(b0, t2);
    			append_dev(div, t3);
    			append_dev(div, br);
    			append_dev(div, t4);
    			append_dev(div, b1);
    			append_dev(b1, t5);
    			append_dev(div, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hpw*/ 8) set_data_dev(t1, /*hpw*/ ctx[3]);
    			if (dirty & /*hpy*/ 32) set_data_dev(t5, /*hpy*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(61:47) ",
    		ctx
    	});

    	return block;
    }

    // (56:1) {#if ((no_hrp && qpw && tpq) && (hpw==1 && mpw==0))}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let b0;
    	let t1;
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let b1;
    	let t6;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b0 = element("b");
    			t1 = text(/*hpw*/ ctx[3]);
    			t2 = text(" hour");
    			t3 = text(" a week ");
    			br = element("br");
    			t4 = text("\n\t\t\tThat's around ");
    			b1 = element("b");
    			b1.textContent = "52";
    			t6 = text(" hours a year!");
    			add_location(b0, file, 57, 23, 1411);
    			add_location(br, file, 57, 48, 1436);
    			add_location(b1, file, 58, 17, 1458);
    			attr_dev(div, "class", "result svelte-1vpamsl");
    			add_location(div, file, 56, 2, 1367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b0);
    			append_dev(b0, t1);
    			append_dev(b0, t2);
    			append_dev(div, t3);
    			append_dev(div, br);
    			append_dev(div, t4);
    			append_dev(div, b1);
    			append_dev(div, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hpw*/ 8) set_data_dev(t1, /*hpw*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(56:1) {#if ((no_hrp && qpw && tpq) && (hpw==1 && mpw==0))}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div10;
    	let h1;
    	let t1;
    	let div9;
    	let div2;
    	let div0;
    	let label0;
    	let t3;
    	let div1;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let br0;
    	let t6;
    	let div5;
    	let div3;
    	let label1;
    	let t8;
    	let div4;
    	let input2;
    	let t9;
    	let input3;
    	let t10;
    	let br1;
    	let t11;
    	let div8;
    	let div6;
    	let label2;
    	let t13;
    	let div7;
    	let input4;
    	let t14;
    	let input5;
    	let t15;
    	let br2;
    	let t16;
    	let br3;
    	let t17;
    	let br4;
    	let t18;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && (/*hpw*/ ctx[3] == 1 && /*mpw*/ ctx[4] == 0)) return create_if_block;
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && /*mpw*/ ctx[4] == 0) return create_if_block_1;
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && (/*hpw*/ ctx[3] == 0 && /*mpw*/ ctx[4] > 0)) return create_if_block_2;
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && (/*hpw*/ ctx[3] == 1 && /*mpw*/ ctx[4] > 0)) return create_if_block_3;
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && (/*hpw*/ ctx[3] > 0 && /*mpw*/ ctx[4] > 0)) return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Bumblebee ROI";
    			t1 = space();
    			div9 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Number of HR Professionals";
    			t3 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			br0 = element("br");
    			t6 = space();
    			div5 = element("div");
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Number of HR Professionals";
    			t8 = space();
    			div4 = element("div");
    			input2 = element("input");
    			t9 = space();
    			input3 = element("input");
    			t10 = space();
    			br1 = element("br");
    			t11 = space();
    			div8 = element("div");
    			div6 = element("div");
    			label2 = element("label");
    			label2.textContent = "Average time per query (in minutes)";
    			t13 = space();
    			div7 = element("div");
    			input4 = element("input");
    			t14 = space();
    			input5 = element("input");
    			t15 = space();
    			br2 = element("br");
    			t16 = space();
    			br3 = element("br");
    			t17 = space();
    			br4 = element("br");
    			t18 = space();
    			if (if_block) if_block.c();
    			add_location(h1, file, 14, 4, 213);
    			attr_dev(label0, "for", "");
    			attr_dev(label0, "class", "svelte-1vpamsl");
    			add_location(label0, file, 21, 4, 337);
    			attr_dev(div0, "class", "flex-child svelte-1vpamsl");
    			add_location(div0, file, 20, 3, 308);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "placeholder", "5");
    			attr_dev(input0, "inputmode", "numeric");
    			attr_dev(input0, "class", "svelte-1vpamsl");
    			add_location(input0, file, 24, 4, 428);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "50");
    			attr_dev(input1, "step", "1");
    			attr_dev(input1, "class", "svelte-1vpamsl");
    			add_location(input1, file, 25, 4, 510);
    			attr_dev(div1, "class", "flex-child svelte-1vpamsl");
    			add_location(div1, file, 23, 3, 399);
    			attr_dev(div2, "class", "flex-container svelte-1vpamsl");
    			add_location(div2, file, 19, 2, 276);
    			add_location(br0, file, 28, 8, 596);
    			attr_dev(label1, "for", "");
    			attr_dev(label1, "class", "svelte-1vpamsl");
    			add_location(label1, file, 31, 4, 664);
    			attr_dev(div3, "class", "flex-child svelte-1vpamsl");
    			add_location(div3, file, 30, 3, 635);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "placeholder", "20");
    			attr_dev(input2, "inputmode", "numeric");
    			attr_dev(input2, "class", "svelte-1vpamsl");
    			add_location(input2, file, 34, 4, 755);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "1");
    			attr_dev(input3, "max", "100");
    			attr_dev(input3, "step", "2");
    			attr_dev(input3, "class", "svelte-1vpamsl");
    			add_location(input3, file, 35, 4, 835);
    			attr_dev(div4, "class", "flex-child svelte-1vpamsl");
    			add_location(div4, file, 33, 3, 726);
    			attr_dev(div5, "class", "flex-container svelte-1vpamsl");
    			add_location(div5, file, 29, 2, 603);
    			add_location(br1, file, 38, 8, 919);
    			attr_dev(label2, "for", "");
    			attr_dev(label2, "class", "svelte-1vpamsl");
    			add_location(label2, file, 41, 4, 987);
    			attr_dev(div6, "class", "flex-child svelte-1vpamsl");
    			add_location(div6, file, 40, 3, 958);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "placeholder", "30");
    			attr_dev(input4, "inputmode", "numeric");
    			attr_dev(input4, "class", "svelte-1vpamsl");
    			add_location(input4, file, 44, 4, 1087);
    			attr_dev(input5, "type", "range");
    			attr_dev(input5, "min", "0");
    			attr_dev(input5, "max", "180");
    			attr_dev(input5, "step", "5");
    			attr_dev(input5, "class", "svelte-1vpamsl");
    			add_location(input5, file, 45, 10, 1173);
    			attr_dev(div7, "class", "flex-child svelte-1vpamsl");
    			add_location(div7, file, 43, 3, 1058);
    			attr_dev(div8, "class", "flex-container svelte-1vpamsl");
    			add_location(div8, file, 39, 2, 926);
    			add_location(br2, file, 48, 8, 1258);
    			add_location(br3, file, 51, 8, 1281);
    			attr_dev(div9, "class", "item svelte-1vpamsl");
    			add_location(div9, file, 18, 4, 255);
    			add_location(br4, file, 54, 1, 1306);
    			attr_dev(div10, "class", "flex svelte-1vpamsl");
    			add_location(div10, file, 12, 0, 189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, h1);
    			append_dev(div10, t1);
    			append_dev(div10, div9);
    			append_dev(div9, div2);
    			append_dev(div2, div0);
    			append_dev(div0, label0);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*no_hrp*/ ctx[0]);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*no_hrp*/ ctx[0]);
    			append_dev(div9, t5);
    			append_dev(div9, br0);
    			append_dev(div9, t6);
    			append_dev(div9, div5);
    			append_dev(div5, div3);
    			append_dev(div3, label1);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, input2);
    			set_input_value(input2, /*qpw*/ ctx[1]);
    			append_dev(div4, t9);
    			append_dev(div4, input3);
    			set_input_value(input3, /*qpw*/ ctx[1]);
    			append_dev(div9, t10);
    			append_dev(div9, br1);
    			append_dev(div9, t11);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, label2);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    			append_dev(div7, input4);
    			set_input_value(input4, /*tpq*/ ctx[2]);
    			append_dev(div7, t14);
    			append_dev(div7, input5);
    			set_input_value(input5, /*tpq*/ ctx[2]);
    			append_dev(div9, t15);
    			append_dev(div9, br2);
    			append_dev(div9, t16);
    			append_dev(div9, br3);
    			append_dev(div10, t17);
    			append_dev(div10, br4);
    			append_dev(div10, t18);
    			if (if_block) if_block.m(div10, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[8]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[9]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[10]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[10]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[11]),
    					listen_dev(input5, "change", /*input5_change_input_handler*/ ctx[12]),
    					listen_dev(input5, "input", /*input5_change_input_handler*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*no_hrp*/ 1 && to_number(input0.value) !== /*no_hrp*/ ctx[0]) {
    				set_input_value(input0, /*no_hrp*/ ctx[0]);
    			}

    			if (dirty & /*no_hrp*/ 1) {
    				set_input_value(input1, /*no_hrp*/ ctx[0]);
    			}

    			if (dirty & /*qpw*/ 2 && to_number(input2.value) !== /*qpw*/ ctx[1]) {
    				set_input_value(input2, /*qpw*/ ctx[1]);
    			}

    			if (dirty & /*qpw*/ 2) {
    				set_input_value(input3, /*qpw*/ ctx[1]);
    			}

    			if (dirty & /*tpq*/ 4 && to_number(input4.value) !== /*tpq*/ ctx[2]) {
    				set_input_value(input4, /*tpq*/ ctx[2]);
    			}

    			if (dirty & /*tpq*/ 4) {
    				set_input_value(input5, /*tpq*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div10, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let tot;
    	let hpw;
    	let mpw;
    	let hpy;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Calc", slots, []);
    	let no_hrp = 5;
    	let qpw = 20;
    	let tpq = 30;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Calc> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		no_hrp = to_number(this.value);
    		$$invalidate(0, no_hrp);
    	}

    	function input1_change_input_handler() {
    		no_hrp = to_number(this.value);
    		$$invalidate(0, no_hrp);
    	}

    	function input2_input_handler() {
    		qpw = to_number(this.value);
    		$$invalidate(1, qpw);
    	}

    	function input3_change_input_handler() {
    		qpw = to_number(this.value);
    		$$invalidate(1, qpw);
    	}

    	function input4_input_handler() {
    		tpq = to_number(this.value);
    		$$invalidate(2, tpq);
    	}

    	function input5_change_input_handler() {
    		tpq = to_number(this.value);
    		$$invalidate(2, tpq);
    	}

    	$$self.$capture_state = () => ({ no_hrp, qpw, tpq, tot, hpw, mpw, hpy });

    	$$self.$inject_state = $$props => {
    		if ("no_hrp" in $$props) $$invalidate(0, no_hrp = $$props.no_hrp);
    		if ("qpw" in $$props) $$invalidate(1, qpw = $$props.qpw);
    		if ("tpq" in $$props) $$invalidate(2, tpq = $$props.tpq);
    		if ("tot" in $$props) $$invalidate(6, tot = $$props.tot);
    		if ("hpw" in $$props) $$invalidate(3, hpw = $$props.hpw);
    		if ("mpw" in $$props) $$invalidate(4, mpw = $$props.mpw);
    		if ("hpy" in $$props) $$invalidate(5, hpy = $$props.hpy);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*no_hrp, qpw, tpq*/ 7) {
    			$$invalidate(6, tot = no_hrp * qpw * tpq);
    		}

    		if ($$self.$$.dirty & /*tot*/ 64) {
    			$$invalidate(3, hpw = Math.floor(tot / 60));
    		}

    		if ($$self.$$.dirty & /*tot*/ 64) {
    			$$invalidate(4, mpw = tot % 60);
    		}

    		if ($$self.$$.dirty & /*tot*/ 64) {
    			$$invalidate(5, hpy = Math.round(tot * 52 / 60));
    		}
    	};

    	return [
    		no_hrp,
    		qpw,
    		tpq,
    		hpw,
    		mpw,
    		hpy,
    		tot,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_input_handler,
    		input3_change_input_handler,
    		input4_input_handler,
    		input5_change_input_handler
    	];
    }

    class Calc extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Calc",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let calc;
    	let current;
    	calc = new Calc({ $$inline: true });

    	const block = {
    		c: function create() {
    			section = element("section");
    			create_component(calc.$$.fragment);
    			attr_dev(section, "class", "svelte-1i4jxvi");
    			add_location(section, file$1, 4, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(calc, section, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calc.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calc.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(calc);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Calc });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
