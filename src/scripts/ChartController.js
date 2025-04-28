/* TradingView Lightweight-Charts controller – ES5‑compatible version (no ES6+ syntax) */

/*
  Prerequisites (add with <script> tags **before** this file):
    1. fetch polyfill for older browsers (e.g. whatwg‑fetch)
    2. lightweight‑charts UMD build that exposes window.createChart
*/

(function (global) {
  'use strict';

  /** @param {Object} target @param {Object} src */
  function extend(target, src) {
    for (var k in src) {
      if (src.hasOwnProperty(k)) target[k] = src[k];
    }
    return target;
  }

  /** Simple unique‑array helper (ES5) */
  function unique(arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (!seen[v]) { seen[v] = true; out.push(v); }
    }
    return out;
  }

  /** Parse JSON when supplied as string */
  function asJson(value) {
    return typeof value === 'string' ? JSON.parse(value) : value;
  }

  /* -------------------- MAIN CONTROLLER -------------------- */

  function ChartController(containerEl, initialPair) {
    if (!(this instanceof ChartController)) return new ChartController(containerEl, initialPair);

    this.GRAPHQL_ENDPOINT = 'https://node.xian.org/graphql';

    this.chartContainer   = containerEl;
    this.chart            = null;
    this.candlestickSeries= null;
    this.volumeSeries     = null;
    this.volumeTooltip    = null;
    this.toggleContainer  = null;

    this.isInverted   = true;
    this.pairs        = [];
    this.currentPair  = typeof initialPair === 'undefined' ? null : initialPair;
    this.tokens       = {};   // contract → { symbol, logo }
    this.volumeByTime = {};   // epoch_sec → volume

    this.timeframes = [
      { label: '30m', minutes:  30 },
      { label: '1h',  minutes:  60 },
      { label: '4h',  minutes: 240 },
      { label: '1d',  minutes: 1440 }
    ];

    this.currentTimeframe = this.timeframes[1]; // default 1h

    this.createSelectors();
    this.loadPairsAndInitialize();
  }

  /* -------------------- PROTOTYPE METHODS -------------------- */

  ChartController.prototype.loadPairsAndInitialize = function () {
    var self = this;
    self.showLoading(true);

    return self.fetchAllPairs()
      .then(function () {
        if (!self.pairs.length) throw new Error('No trading pairs found');
        if (!self.currentPair) self.currentPair = self.pairs[0];
        self.updateSelectorsFromState && self.updateSelectorsFromState();
        return self.initializeChart();
      })
      .catch(function (e) { self.showError('Error loading pairs: ' + e.message); })
      .finally(function () { self.showLoading(false); });
  };

  ChartController.prototype.initializeChart = function () {
    var self = this;
    if (!self.currentPair) return Promise.resolve();

    self.chartContainer.style.minHeight = '450px';

    // createChart comes from lightweight‑charts UMD build
    self.chart = global.createChart(self.chartContainer, {
      autoSize: true,
      height: 450,
      layout: { background: { color: '#1a1a1a' }, textColor: '#d4d4d4' },
      grid:   { vertLines: { color: '#2a2a2a' }, horzLines: { color: '#2a2a2a' } },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        timezone: 'browser',
        tickMarkFormatter: function (t) {
          return new Date(t * 1000).toLocaleString();
        }
      }
    });

    self.initSeries();
    self.createVolumeTooltip();
    self.updateChartTitle && self.updateChartTitle();
    self.createPairToggle && self.createPairToggle();

    // wait one frame then load data
    return new Promise(function (resolve) {
      global.requestAnimationFrame(function () { resolve(); });
    }).then(function () { return self.loadChartData(); });
  };

  ChartController.prototype.fetchAllPairs = function () {
    var self = this;
    var gql = 'query { allEvents(condition:{contract:"con_pairs",event:"PairCreated"}) { edges { node { dataIndexed data } } } }';

    return fetch(self.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql })
    })
      .then(function (r) { return r.json(); })
      .then(function (resp) {
        var edges = (resp && resp.data && resp.data.allEvents && resp.data.allEvents.edges) || [];
        self.pairs = edges.map(function (edge) {
          var node = edge.node;
          var idx = asJson(node.dataIndexed);
          var raw = asJson(node.data);
          return { id: raw.pair, token0: idx.token0, token1: idx.token1 };
        });

        var flat = [];
        for (var i = 0; i < self.pairs.length; i++) {
          flat.push(self.pairs[i].token0, self.pairs[i].token1);
        }
        return self.fetchTokensMetadata(unique(flat));
      })
      .then(function () { self.updatePairSelector && self.updatePairSelector(); });
  };

  ChartController.prototype.fetchTokensMetadata = function (contracts) {
    var self = this;
    if (!contracts.length) return Promise.resolve();

    var fields = ['token_symbol', 'token_logo_url'];
    var parts = [];
    for (var i = 0; i < contracts.length; i++) {
      for (var j = 0; j < fields.length; j++) {
        parts.push('f' + i + '_' + fields[j] + ':allStates(condition:{key:"' + contracts[i] + '.metadata:' + fields[j] + '"}){nodes{value}}');
      }
    }
    var fullQuery = 'query{ ' + parts.join('\n') + ' }';

    return fetch(self.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: fullQuery })
    })
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (resp) {
        for (var i = 0; i < contracts.length; i++) {
          var c = contracts[i];
          var symNode = resp && resp.data && resp.data['f' + i + '_token_symbol'];
          var logoNode= resp && resp.data && resp.data['f' + i + '_token_logo_url'];
          var sym  = symNode && symNode.nodes && symNode.nodes[0] && symNode.nodes[0].value || c;
          var logo = logoNode && logoNode.nodes && logoNode.nodes[0] && logoNode.nodes[0].value || null;
          self.tokens[c] = { contract: c, symbol: sym, logo: logo };
        }
      });
  };

  ChartController.prototype.createSelectors = function () {
    var self = this;

    var wrap = document.createElement('div');
    wrap.className = 'selector-container';
    extend(wrap.style, {
      position: 'absolute', top: '10px', left: '10px', zIndex: 5,
      background: '#2a2a2a', padding: '8px', borderRadius: '4px',
      boxShadow: '0 4px 6px rgba(0,0,0,.3)', display: 'flex', gap: '10px'
    });

    self.pairSelect = document.createElement('select');
    self.styledSelect(self.pairSelect);
    self.pairSelect.onchange = function () {
      var id = self.pairSelect.value;
      self.changePair && self.changePair(id);
      self.loadChartData();
    };

    self.timeframeSelect = document.createElement('select');
    self.styledSelect(self.timeframeSelect);
    for (var i = 0; i < self.timeframes.length; i++) {
      var tf = self.timeframes[i];
      var o = document.createElement('option');
      o.value = tf.minutes;
      o.textContent = tf.label;
      self.timeframeSelect.appendChild(o);
    }
    self.timeframeSelect.onchange = function () {
      var val = parseInt(self.timeframeSelect.value, 10);
      for (var i = 0; i < self.timeframes.length; i++) {
        if (self.timeframes[i].minutes === val) {
          self.currentTimeframe = self.timeframes[i];
          break;
        }
      }
      self.updateQueryParams && self.updateQueryParams();
      self.initSeries();
      self.loadChartData();
    };

    wrap.appendChild(document.createTextNode('Trading Pair: '));
    wrap.appendChild(self.pairSelect);
    wrap.appendChild(document.createTextNode('  Timeframe: '));
    wrap.appendChild(self.timeframeSelect);
    self.chartContainer.appendChild(wrap);
  };

  ChartController.prototype.styledSelect = function (el) {
    extend(el.style, {
      padding: '6px 10px', borderRadius: '4px', border: '1px solid #3a3a3a',
      background: '#1e1e1e', color: '#eee'
    });
  };

  ChartController.prototype.initSeries = function () {
    var self = this;
    if (!self.chart) return;

    if (self.candlestickSeries) {
      try { self.chart.removeSeries(self.candlestickSeries); } catch (e) {}
      self.candlestickSeries = null;
    }
    if (self.volumeSeries) {
      try { self.chart.removeSeries(self.volumeSeries); } catch (e) {}
      self.volumeSeries = null;
    }

    self.candlestickSeries = self.chart.addCandlestickSeries({
      upColor: '#0066ff', downColor: '#9933ff', borderVisible: true,
      wickUpColor: '#0066ff', wickDownColor: '#9933ff',
      priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 }
    });

    self.volumeSeries = self.chart.addHistogramSeries({
      priceScaleId: 'volume', color: '#0066ff80', scaleMargins: { top: 0.8, bottom: 0 }
    });
  };

  ChartController.prototype.loadChartData = function () {
    var self = this;
    self.showLoading(true);

    return self.fetchSwapEvents()
      .then(function (res) {
        var candles = res.candles, volumes = res.volumes;
        if (!candles.length) {
          self.showError('No trades');
          self.showLoading(false);
          return;
        }
        if (self.candlestickSeries) self.candlestickSeries.setData(candles);
        if (self.volumeSeries) self.volumeSeries.setData(volumes);
        self.volumeByTime = {};
        for (var i = 0; i < volumes.length; i++) {
          self.volumeByTime[volumes[i].time] = volumes[i].value;
        }
        if (self.chart) self.chart.timeScale().fitContent();
        self.showLoading(false);
      });
  };

  ChartController.prototype.fetchSwapEvents = function () {
    var self = this;
    if (!self.currentPair) return Promise.resolve({ candles: [], volumes: [] });

    var query = 'query LatestSwaps { allEvents(condition:{contract:"con_pairs",event:"Swap"} filter:{dataIndexed:{contains:{pair:"' + self.currentPair.id + '"}}} orderBy:CREATED_DESC first:500) { edges { node { dataIndexed data created } } } }';

    return fetch(self.GRAPHQL_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (resp) {
        var edges = resp && resp.data && resp.data.allEvents && resp.data.allEvents.edges || [];
        if (!edges.length) return { candles: [], volumes: [] };

        edges.reverse(); // oldest -> newest
        var tfMinutes = self.currentTimeframe.minutes;
        var bucketMs  = tfMinutes * 60 * 1000;

        function bucketStart(t) { return Math.floor(t / bucketMs) * bucketMs; }

        var buckets = {};

        for (var i = 0; i < edges.length; i++) {
          var node   = edges[i].node;
          var idx    = asJson(node.dataIndexed);
          var raw    = asJson(node.data);
          var timeMs = new Date(node.created).getTime();
          var key    = bucketStart(timeMs);

          var pRaw = Number(idx.price || idx.token1_per_token0 || (raw && raw.price) || 0);
          if (!pRaw || !isFinite(pRaw)) {
            var a0in = +raw.amount0In || 0;
            var a1out= +raw.amount1Out || 0;
            if (a0in && a1out) pRaw = a1out / a0in;
          }
          if (!pRaw || !isFinite(pRaw)) continue;

          var price = self.isInverted ? pRaw : 1 / pRaw;
          var vol   = Math.abs(+raw.amount0In || +raw.amount0Out || +raw.amount1In || +raw.amount1Out || 0);

          if (!buckets[key]) {
            buckets[key] = { time: key / 1000, open: price, high: price, low: price, close: price, volume: vol };
          } else {
            var b = buckets[key];
            b.high   = Math.max(b.high, price);
            b.low    = Math.min(b.low,  price);
            b.close  = price;
            b.volume += vol;
          }
        }

        var keys = Object.keys(buckets).sort(function (a, b) { return a - b; });
        var candles = [];
        var volumes = [];
        for (var i = 0; i < keys.length; i++) {
          var b = buckets[keys[i]];
          candles.push({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close });
          volumes.push({ time: b.time, value: b.volume });
        }
        return { candles: candles, volumes: volumes };
      });
  };

  ChartController.prototype.createVolumeTooltip = function () {
    var self = this;
    var tip = document.createElement('div');
    extend(tip.style, { position: 'absolute', display: 'none', padding: '6px 10px', background: '#2a2a2a', color: '#d4d4d4', fontSize: '12px', zIndex: 10 });
    self.chartContainer.appendChild(tip);
    self.volumeTooltip = tip;

    self.chart.subscribeCrosshairMove(function (param) {
      if (!param.time) { tip.style.display = 'none'; return; }
      var vol = self.volumeByTime[param.time];
      if (typeof vol === 'undefined') { tip.style.display = 'none'; return; }
      tip.textContent = 'Volume: ' + Number(vol).toLocaleString();
      tip.style.left = (param.point.x + 15) + 'px';
      tip.style.top  = (self.chartContainer.clientHeight * 0.8) + 'px';
      tip.style.display = 'block';
    });
  };

  ChartController.prototype.updateQueryParams = function () {
    var self = this;
    if (!global.location || !global.history) return;
    var p = new global.URLSearchParams(global.location.search);
    p.set('pair', self.currentPair ? self.currentPair.id : '');
    p.set('tf', self.currentTimeframe.minutes);
    p.set('inverted', self.isInverted);
    global.history.replaceState({}, '', global.location.pathname + '?' + p.toString());
  };

  ChartController.prototype.showLoading = function (flag) {
    var l = document.getElementById('loading');
    if (l) l.style.display = flag ? 'block' : 'none';
  };

  ChartController.prototype.showError = function (msg) {
    var e = document.getElementById('error');
    if (e) { e.textContent = msg; e.style.display = 'block'; }
  };

  /* -------------------- EXPORT -------------------- */
  global.ChartController = ChartController;

})(typeof window !== 'undefined' ? window : this);
