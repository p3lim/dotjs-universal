/* coffee-script example usage - at https://github.com/johan/dotjs/commits/johan

   on path_re: ['^/([^/]+)/([^/]+)(/?.*)', 'user', 'repo', 'rest']
      query: true
      dom:
        keyboard: 'css  .keyboard-shortcuts'
        branches: 'css+ .js-filter-branches h4 a'
        dates:    'css* .commit-group-heading'
        tracker:  'css? #gauges-tracker[defer]'
        johan_ci: 'xpath* //li[contains(@class,"commit")][.//a[.="johan"]]'
      ready: (path, query, dom) ->

   ...would make something like this call, as the path regexp matched, and there
   were DOM matches for the two mandatory "keyboard" and "branches" selectors:

   ready( { user: 'johan', repo: 'dotjs', rest: '/commits/johan' }
        , {} // would contain all query args (if any were present)
        , { keyboard: Node<a href="#keyboard_shortcuts_pane">
          , branches: [ Node<a href="/johan/dotjs/commits/coffee">
                      , Node<a href="/johan/dotjs/commits/dirs">
                      , Node<a href="/johan/dotjs/commits/gh-pages">
                      , Node<a href="/johan/dotjs/commits/johan">
                      , Node<a href="/johan/dotjs/commits/jquery-1.8.2">
                      , Node<a href="/johan/dotjs/commits/master">
                      ]
          , dates: [ Node<h3 class="commit-group-heading">Oct 07, 2012</h3>
                   , Node<h3 class="commit-group-heading">Aug 29, 2012</h3>
                   , ...
                   ]
          , tracker: null
          , johan_ci: [ Node<li class="commit">, ... ]
          }
        )

   A selector returns an array of matches prefixed for "css*" and "css+" (ditto
   xpath), and a single result if it is prefixed "css" or "css?":

   If your script should only run on pages with a particular DOM node (or set of
   nodes), use the 'css' or 'css+' (ditto xpath) forms - and your callback won't
   get fired on pages that lack them. The 'css?' and 'css*' forms would run your
   callback but pass null or [] respectively, on not finding such nodes. You may
   recognize the semantics of x, x?, x* and x+ from regular expressions.

   (see http://goo.gl/ejtMD for a more thorough discussion of something similar)

   The dom property is recursively defined so you can make nested structures.
   If you want a property that itself is an object full of matched things, pass
   an object of sub-dom-spec:s, instead of a string selector:

   on dom:
        meta:
          base:  'xpath? /head/base
          title: 'xpath  string(/head/title)'
        commits: 'css* li.commit'
      ready: (dom) ->

   You can also deconstruct repeated templated sections of a page into subarrays
   scraped as per your specs, by picking a context node for a dom spec. This is
   done by passing a two-element array: a selector resolving what node/nodes you
   look at and a dom spec describing how you want it/them deconstructed for you:

   on dom:
        meta:
          [ 'xpath /head',
            base:  'xpath? base
            title: 'xpath  string(title)'
          ]
        commits:
          [ 'css* li.commit',
            avatar_url:  ['css img.gravatar', 'xpath string(@src)']
            author_name: 'xpath string(.//*[@class="author-name"])'
          ]
      ready: (dom) ->

   The mandatory/optional selector rules defined above behave as you'd expect as
   used for context selectors too: a mandatory node or array of nodes will limit
   what pages your script gets called on to those that match it, so your code is
   free to assume it will always be there when it runs. An optional context node
   that is not found will instead result in that part of your DOM being null, or
   an empty array, in the case of a * selector.

   Finally, there is the xpath! keyword, which is similar to xpath, but it also
   mandates that whatever is returned is truthy. This is useful when you use the
   xpath functions returning strings, numbers and of course booleans, to assert
   things about the pages you want to run on, like 'xpath! count(//img) = 0', if
   you never want the script to run on pages with inline images, say.

   After you have called on(), you may call on.dom to do page scraping later on,
   returning whatever matched your selector(s) passed. Mandatory selectors which
   failed to match at this point will return undefined, optional selectors null:

     on.dom('xpath  //a[@id]') => undefined or <a id="...">
     on.dom('xpath? //a[@id]') => null      or <a id="...">
     on.dom('xpath+ //a[@id]') => undefined or [<a id="...">, <a id="...">, ...]
     on.dom('xpath* //a[@id]') => []        or [<a id="...">, <a id="...">, ...]

   A readable way to detect a failed mandatory match is on.dom(...) === on.FAIL;

 */

function on(opts) {
  //console.info('on', opts);
  try {
  var Object_toString = Object.prototype.toString
    , Array_slice = Array.prototype.slice
    , FAIL = 'dom' in on ? undefined : (function() {
        var tests =
              { path_re: { fn: test_regexp, self: location.pathname }
              , query:   { fn: test_query,  self: location.search }
              , dom:     { fn: test_dom,    self: document
                         , my: { 'css':    not_null($C)
                               , 'css?':   $C
                               , 'css+':   one_or_more($c)
                               , 'css*':   $c
                               , 'xpath':  not_null($X)
                               , 'xpath?': $X
                               , 'xpath+': one_or_more($x)
                               , 'xpath*': $x
                               , 'xpath!': truthy($x)
                               }
                         }
              , inject: { fn: inject }
              }
          , name, test, me, my, mine
          ;

        for (name in tests) {
          test = tests[name];
          me = test.fn;
          if ((my = test.my))
            for (mine in my)
              me[mine] = my[mine];
          on[name] = me.bind(test.self);
        }
      })()

    , input = [] // args for the callback(s?) the script wants to run
    , rules = Object.create(opts) // wraps opts in a pokeable inherit layer
    , debug = get('debug')
    , script = get('name')
    , ready = get('ready')
    , load = get('load')
    , pushState = get('pushstate')
    , pjax_event = get('pjaxevent')
    , name, rule, test, result, retry
    ;

  if (typeof ready !== 'function' &&
      typeof load  !== 'function' &&
      typeof pushState !== 'function') {
    alert('no on function');
    throw new Error('on() needs at least a "ready" or "load" function!');
  }

  if (pushState && history.pushState &&
      (on.pushState = on.pushState || []).indexOf(opts) === -1) {
    on.pushState.push(opts); // make sure we don't re-register after navigation
    initPushState(pushState, pjax_event);
  }

  try {
    for (name in rules) {
      rule = rules[name];
      if (rule === undefined) continue; // was some callback or other non-rule
      test = on[name];
      if (!test) throw new Error('did not grok rule "'+ name +'"!');
      result = test(rule);
      if (result === FAIL) return false; // the page doesn't satisfy all rules
      input.push(result);
    }
  }
  catch(e) {
    if (debug) console.warn("on(debug): we didn't run because " + e.message);
    return false;
  }

  if (ready) {
    ready.apply(opts, input.concat());
  }
  if (load) window.addEventListener('load', function() {
    load.apply(opts, input.concat());
  });
  return input.concat(opts);

  function get(x) { rules[x] = undefined; return opts[x]; }
  function isArray(x)  { return Object_toString.call(x) === '[object Array]'; }
  function isObject(x) { return Object_toString.call(x) === '[object Object]'; }
  function array(a)    { return Array_slice.call(a, 0); } // array:ish => Array
  function arrayify(x) { return isArray(x) ? x : [x]; }  // non-array? => Array
  function inject(fn, args) {
    var script = document.createElement('script')
      , parent = document.documentElement;
    args = JSON.stringify(args || []).slice(1, -1);
    script.textContent = '('+ fn +')('+ args +');';
    parent.appendChild(script);
    parent.removeChild(script);
  }

  function initPushState(callback, pjax_event) {
    if (!history.pushState.armed) {
      inject(function(pjax_event) {
        function reportBack() {
          var e = document.createEvent('Events');
          e.initEvent('history.pushState', !'bubbles', !'cancelable');
          document.dispatchEvent(e);
        }
        var pushState = history.pushState;
        history.pushState = function on_pushState() {
          if (pjax_event && window.$ && $.pjax)
            $(document).one(pjax_event, reportBack);
          else
            setTimeout(reportBack, 0);
          return pushState.apply(this, arguments);
        };
      }, [pjax_event]);
      history.pushState.armed = pjax_event;
    }

    retry = function after_pushState() {
      rules = Object.create(opts);
      rules.load = rules.pushstate = undefined;
      rules.ready = callback;
      on(rules);
    };

    document.addEventListener('history.pushState', function() {
      if (debug) console.log('on.pushstate', location.pathname);
      retry();
    }, false);
  }

  function test_query(spec) {
    var q = unparam(this);
    if (spec === true || spec == null) return q; // decode the query for me!
    throw new Error('bad query type '+ (typeof spec) +': '+ spec);
  }

  function unparam(query) {
    var data = {};
    (query || '').replace(/\+/g, '%20').split('&').forEach(function(kv) {
      kv = /^\??([^=]*)=(.*)/.exec(kv);
      if (!kv) return;
      var prop, val, k = kv[1], v = kv[2], e, m;
      try { prop = decodeURIComponent(k); } catch (e) { prop = unescape(k); }
      try { val  = decodeURIComponent(v); } catch (e) { val  = unescape(v); }
      data[prop] = val;
    });
    return data;
  }

  function test_regexp(spec) {
    if (!isArray(spec)) spec = arrayify(spec);
    var re = spec.shift();
    if (typeof re === 'string') re = new RegExp(re);
    if (!(re instanceof RegExp))
      throw new Error((typeof re) +' was not a regexp: '+ re);

    var ok = re.exec(this);
    if (ok === null) return FAIL;
    if (!spec.length) return ok;
    var named = {};
    ok.shift(); // drop matching-whole-regexp part
    while (spec.length) named[spec.shift()] = ok.shift();
    return named;
  }

  function truthy(fn) { return function(s) {
    var x = fn.apply(this, arguments); return x || FAIL;
  }; }

  function not_null(fn) { return function(s) {
    var x = fn.apply(this, arguments); return x !== null ? x : FAIL;
  }; }

  function one_or_more(fn) { return function(s) {
    var x = fn.apply(this, arguments); return x.length ? x : FAIL;
  }; }

  function $c(css) { return array(this.querySelectorAll(css)); }
  function $C(css) { return this.querySelector(css); }

  function $x(xpath) {
    var doc = this.evaluate ? this : this.ownerDocument, next;
    var got = doc.evaluate(xpath, this, null, 0, null), all = [];
    switch (got.resultType) {
      case got.STRING_TYPE:  return got.stringValue;
      case got.NUMBER_TYPE:  return got.numberValue;
      case got.BOOLEAN_TYPE: return got.booleanValue;
      default: while ((next = got.iterateNext())) all.push(next); return all;
    }
  }
  function $X(xpath) {
    var got = $x.call(this, xpath);
    return got instanceof Array ? got[0] || null : got;
  }

  // DOM constraint tester / scraper facility:
  // "this" is the context Node(s) - initially the document
  // "spec" is either of:
  //   * css / xpath Selector "selector_type selector"
  //   * resolved for context [ context Selector, spec ]
  //   * an Object of spec(s) { property_name: spec, ... }
  function test_dom(spec, context) {
    // returns FAIL if it turned out it wasn't a mandated match at this level
    // returns null if it didn't find optional matches at this level
    // returns Node or an Array of nodes, or a basic type from some XPath query
    function lookup(rule) {
      if (typeof rule !== 'string')
        throw new Error('non-String dom match rule: '+ rule);
      var match = /^((?:css|xpath)[?+*!]?)\s+(.*)/.exec(rule), type, func;
      if (match) {
        type = match[1];
        rule = match[2];
        func = test_dom[type];
      }
      if (!func) throw new Error('unknown dom match rule '+ type +': '+ rule);
      return func.call(this, rule);
    }

    var results, result, i, property_name;
    if (context === undefined) context = this;

    // validate context:
    if (context === null || context === FAIL) return FAIL;
    if (isArray(context)) {
      for (results = [], i = 0; i < context.length; i++) {
        result = test_dom.call(context[i], spec);
        if (result !== FAIL)
          results.push(result);
      }
      return results;
    }
    if (typeof context !== 'object' || !('nodeType' in context))
      throw new Error('illegal context: '+ context);

    // handle input spec format:
    if (typeof spec === 'string') return lookup.call(context, spec);
    if (isArray(spec)) {
      context = lookup.call(context, spec[0]);
      if (context === null || context === FAIL) return context;
      return test_dom.call(context, spec[1]);
    }
    if (isObject(spec)) {
      results = {};
      for (property_name in spec) {
        result = test_dom.call(context, spec[property_name]);
        if (result === FAIL) return FAIL;
        results[property_name] = result;
      }
      return results;
    }

    throw new Error("dom spec was neither a String, Object nor Array: "+ spec);
  }
  } catch(e) {
    console.error(e);
  }
}
