import { b3 as require$$0, a as inject, j as createVNode } from './vue-vendor-Byo5TD6r.js';

var Acoustic = {};

var runtime = {};

Object.defineProperty(runtime, "__esModule", {
  value: true
});
runtime.DEFAULT_ICON_CONFIGS = void 0;
runtime.IconConverter = IconConverter$1;
runtime.IconProvider = void 0;
runtime.IconWrapper = IconWrapper$1;

var _vue$1g = require$$0;

var DEFAULT_ICON_CONFIGS$1 = {
  size: '1em',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  rtl: false,
  theme: 'outline',
  colors: {
    outline: {
      fill: '#333',
      background: 'transparent'
    },
    filled: {
      fill: '#333',
      background: '#FFF'
    },
    twoTone: {
      fill: '#333',
      twoTone: '#2F88FF'
    },
    multiColor: {
      outStrokeColor: '#333',
      outFillColor: '#2F88FF',
      innerStrokeColor: '#FFF',
      innerFillColor: '#43CCF8'
    }
  },
  prefix: 'i'
};
runtime.DEFAULT_ICON_CONFIGS = DEFAULT_ICON_CONFIGS$1;

function guid$1() {
  return 'icon-' + ((1 + Math.random()) * 0x100000000 | 0).toString(16).substring(1);
}

function IconConverter$1(id, icon, config) {
  var fill = typeof icon.fill === 'string' ? [icon.fill] : icon.fill || [];
  var colors = [];
  var theme = icon.theme || config.theme;

  switch (theme) {
    case 'outline':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push('none');
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push('none');
      break;

    case 'filled':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push('#FFF');
      colors.push('#FFF');
      break;

    case 'two-tone':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[1] === 'string' ? fill[1] : config.colors.twoTone.twoTone);
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[1] === 'string' ? fill[1] : config.colors.twoTone.twoTone);
      break;

    case 'multi-color':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[1] === 'string' ? fill[1] : config.colors.multiColor.outFillColor);
      colors.push(typeof fill[2] === 'string' ? fill[2] : config.colors.multiColor.innerStrokeColor);
      colors.push(typeof fill[3] === 'string' ? fill[3] : config.colors.multiColor.innerFillColor);
      break;
  }

  return {
    size: icon.size || config.size,
    strokeWidth: icon.strokeWidth || config.strokeWidth,
    strokeLinecap: icon.strokeLinecap || config.strokeLinecap,
    strokeLinejoin: icon.strokeLinejoin || config.strokeLinejoin,
    colors: colors,
    id: id
  };
}

var IconContext$1 = Symbol('icon-context');

var IconProvider = function IconProvider(config) {
  (0, _vue$1g.provide)(IconContext$1, config);
};

runtime.IconProvider = IconProvider;

function IconWrapper$1(name, rtl, render) {
  var options = {
    name: 'icon-' + name,
    props: ['size', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'theme', 'fill', 'spin'],
    setup: function setup(props) {
      var id = guid$1();
      var ICON_CONFIGS = (0, _vue$1g.inject)(IconContext$1, DEFAULT_ICON_CONFIGS$1);
      return function () {
        var size = props.size,
            strokeWidth = props.strokeWidth,
            strokeLinecap = props.strokeLinecap,
            strokeLinejoin = props.strokeLinejoin,
            theme = props.theme,
            fill = props.fill,
            spin = props.spin;
        var svgProps = IconConverter$1(id, {
          size: size,
          strokeWidth: strokeWidth,
          strokeLinecap: strokeLinecap,
          strokeLinejoin: strokeLinejoin,
          theme: theme,
          fill: fill
        }, ICON_CONFIGS);
        var cls = [ICON_CONFIGS.prefix + '-icon'];
        cls.push(ICON_CONFIGS.prefix + '-icon' + '-' + name);

        if (rtl && ICON_CONFIGS.rtl) {
          cls.push(ICON_CONFIGS.prefix + '-icon-rtl');
        }

        if (spin) {
          cls.push(ICON_CONFIGS.prefix + '-icon-spin');
        }

        return (0, _vue$1g.createVNode)("span", {
          "class": cls.join(' ')
        }, [render(svgProps)]);
      };
    }
  };
  return options;
}

Object.defineProperty(Acoustic, "__esModule", {
  value: true
});
var default_1$1f = Acoustic.default = void 0;

var _vue$1f = require$$0;

var _runtime$1f = runtime;

var _default$1f = (0, _runtime$1f.IconWrapper)('acoustic', false, function (props) {
  return (0, _vue$1f.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1f.createVNode)("path", {
    "d": "M24 3.99976V43.9998",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$1f.createVNode)("path", {
    "d": "M34 11.9998V35.9998",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$1f.createVNode)("path", {
    "d": "M4 17.9998V29.9998",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$1f.createVNode)("path", {
    "d": "M44 17.9998V29.9998",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$1f.createVNode)("path", {
    "d": "M14 11.9998V35.9998",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$1f = Acoustic.default = _default$1f;

var Api = {};

Object.defineProperty(Api, "__esModule", {
  value: true
});
var default_1$1e = Api.default = void 0;

var _vue$1e = require$$0;

var _runtime$1e = runtime;

var _default$1e = (0, _runtime$1e.IconWrapper)('api', true, function (props) {
  return (0, _vue$1e.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1e.createVNode)("path", {
    "d": "M37 22.0001L34 25.0001L23 14.0001L26 11.0001C27.5 9.50002 33 7.00005 37 11.0001C41 15.0001 38.5 20.5 37 22.0001Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1e.createVNode)("path", {
    "d": "M42 6L37 11",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1e.createVNode)("path", {
    "d": "M11 25.9999L14 22.9999L25 33.9999L22 36.9999C20.5 38.5 15 41 11 36.9999C7 32.9999 9.5 27.5 11 25.9999Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1e.createVNode)("path", {
    "d": "M23 32L27 28",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1e.createVNode)("path", {
    "d": "M6 42L11 37",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1e.createVNode)("path", {
    "d": "M16 25L20 21",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$1e = Api.default = _default$1e;

var ArrowUp = {};

Object.defineProperty(ArrowUp, "__esModule", {
  value: true
});
var default_1$1d = ArrowUp.default = void 0;

var _vue$1d = require$$0;

var _runtime$1d = runtime;

var _default$1d = (0, _runtime$1d.IconWrapper)('arrow-up', false, function (props) {
  return (0, _vue$1d.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1d.createVNode)("path", {
    "d": "M24 6V42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1d.createVNode)("path", {
    "d": "M12 18L24 6L36 18",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$1d = ArrowUp.default = _default$1d;

var Attention = {};

Object.defineProperty(Attention, "__esModule", {
  value: true
});
var default_1$1c = Attention.default = void 0;

var _vue$1c = require$$0;

var _runtime$1c = runtime;

var _default$1c = (0, _runtime$1c.IconWrapper)('attention', true, function (props) {
  return (0, _vue$1c.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1c.createVNode)("path", {
    "d": "M24 44C29.5228 44 34.5228 41.7614 38.1421 38.1421C41.7614 34.5228 44 29.5228 44 24C44 18.4772 41.7614 13.4772 38.1421 9.85786C34.5228 6.23858 29.5228 4 24 4C18.4772 4 13.4772 6.23858 9.85786 9.85786C6.23858 13.4772 4 18.4772 4 24C4 29.5228 6.23858 34.5228 9.85786 38.1421C13.4772 41.7614 18.4772 44 24 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1c.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M24 37C25.3807 37 26.5 35.8807 26.5 34.5C26.5 33.1193 25.3807 32 24 32C22.6193 32 21.5 33.1193 21.5 34.5C21.5 35.8807 22.6193 37 24 37Z",
    "fill": props.colors[2]
  }, null), (0, _vue$1c.createVNode)("path", {
    "d": "M24 12V28",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$1c = Attention.default = _default$1c;

var Bill = {};

Object.defineProperty(Bill, "__esModule", {
  value: true
});
var default_1$1b = Bill.default = void 0;

var _vue$1b = require$$0;

var _runtime$1b = runtime;

var _default$1b = (0, _runtime$1b.IconWrapper)('bill', false, function (props) {
  return (0, _vue$1b.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1b.createVNode)("path", {
    "d": "M10 6C10 4.89543 10.8954 4 12 4H36C37.1046 4 38 4.89543 38 6V44L31 39L24 44L17 39L10 44V6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1b.createVNode)("path", {
    "d": "M18 22L30 22",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1b.createVNode)("path", {
    "d": "M18 30L30 30",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1b.createVNode)("path", {
    "d": "M18 14L30 14",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$1b = Bill.default = _default$1b;

var Blackboard = {};

Object.defineProperty(Blackboard, "__esModule", {
  value: true
});
var default_1$1a = Blackboard.default = void 0;

var _vue$1a = require$$0;

var _runtime$1a = runtime;

var _default$1a = (0, _runtime$1a.IconWrapper)('blackboard', true, function (props) {
  return (0, _vue$1a.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1a.createVNode)("rect", {
    "x": "8",
    "y": "7",
    "width": "32",
    "height": "24",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1a.createVNode)("path", {
    "d": "M4 7H44",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1a.createVNode)("path", {
    "d": "M15 41L24 31L33 41",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1a.createVNode)("path", {
    "d": "M16 13H32",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1a.createVNode)("path", {
    "d": "M16 19H28",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1a.createVNode)("path", {
    "d": "M16 25H22",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$1a = Blackboard.default = _default$1a;

var BranchOne = {};

Object.defineProperty(BranchOne, "__esModule", {
  value: true
});
var default_1$19 = BranchOne.default = void 0;

var _vue$19 = require$$0;

var _runtime$19 = runtime;

var _default$19 = (0, _runtime$19.IconWrapper)('branch-one', false, function (props) {
  return (0, _vue$19.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$19.createVNode)("path", {
    "d": "M24 33V15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$19.createVNode)("rect", {
    "x": "10",
    "y": "9",
    "width": "28",
    "height": "6",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$19.createVNode)("path", {
    "d": "M8 32L14 25H33.9743L40 32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$19.createVNode)("rect", {
    "x": "4",
    "y": "33",
    "width": "8",
    "height": "8",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$19.createVNode)("rect", {
    "x": "20",
    "y": "33",
    "width": "8",
    "height": "8",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$19.createVNode)("rect", {
    "x": "36",
    "y": "33",
    "width": "8",
    "height": "8",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$19 = BranchOne.default = _default$19;

var Check = {};

Object.defineProperty(Check, "__esModule", {
  value: true
});
var default_1$18 = Check.default = void 0;

var _vue$18 = require$$0;

var _runtime$18 = runtime;

var _default$18 = (0, _runtime$18.IconWrapper)('check', true, function (props) {
  return (0, _vue$18.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$18.createVNode)("path", {
    "d": "M43 11L16.875 37L5 25.1818",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$18 = Check.default = _default$18;

var CheckOne = {};

Object.defineProperty(CheckOne, "__esModule", {
  value: true
});
var default_1$17 = CheckOne.default = void 0;

var _vue$17 = require$$0;

var _runtime$17 = runtime;

var _default$17 = (0, _runtime$17.IconWrapper)('check-one', true, function (props) {
  return (0, _vue$17.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$17.createVNode)("path", {
    "d": "M24 44C29.5228 44 34.5228 41.7614 38.1421 38.1421C41.7614 34.5228 44 29.5228 44 24C44 18.4772 41.7614 13.4772 38.1421 9.85786C34.5228 6.23858 29.5228 4 24 4C18.4772 4 13.4772 6.23858 9.85786 9.85786C6.23858 13.4772 4 18.4772 4 24C4 29.5228 6.23858 34.5228 9.85786 38.1421C13.4772 41.7614 18.4772 44 24 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$17.createVNode)("path", {
    "d": "M16 24L22 30L34 18",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$17 = CheckOne.default = _default$17;

var Clear = {};

Object.defineProperty(Clear, "__esModule", {
  value: true
});
var default_1$16 = Clear.default = void 0;

var _vue$16 = require$$0;

var _runtime$16 = runtime;

var _default$16 = (0, _runtime$16.IconWrapper)('clear', false, function (props) {
  return (0, _vue$16.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$16.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M20 5.91406H28V13.9141H43V21.9141H5V13.9141H20V5.91406Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$16.createVNode)("path", {
    "d": "M8 40H40V22H8V40Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$16.createVNode)("path", {
    "d": "M16 39.8976V33.9141",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$16.createVNode)("path", {
    "d": "M24 39.8977V33.8977",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$16.createVNode)("path", {
    "d": "M32 39.8976V33.9141",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$16.createVNode)("path", {
    "d": "M12 40H36",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$16 = Clear.default = _default$16;

var ClickToFold = {};

Object.defineProperty(ClickToFold, "__esModule", {
  value: true
});
var default_1$15 = ClickToFold.default = void 0;

var _vue$15 = require$$0;

var _runtime$15 = runtime;

var _default$15 = (0, _runtime$15.IconWrapper)('click-to-fold', true, function (props) {
  return (0, _vue$15.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$15.createVNode)("path", {
    "d": "M27 9V21H39",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$15.createVNode)("path", {
    "d": "M21 39V27H9",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$15.createVNode)("path", {
    "d": "M27 21L42 6",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$15.createVNode)("path", {
    "d": "M21 27L6 42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$15 = ClickToFold.default = _default$15;

var Close = {};

Object.defineProperty(Close, "__esModule", {
  value: true
});
var default_1$14 = Close.default = void 0;

var _vue$14 = require$$0;

var _runtime$14 = runtime;

var _default$14 = (0, _runtime$14.IconWrapper)('close', false, function (props) {
  return (0, _vue$14.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$14.createVNode)("path", {
    "d": "M8 8L40 40",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$14.createVNode)("path", {
    "d": "M8 40L40 8",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$14 = Close.default = _default$14;

var CloseOne = {};

Object.defineProperty(CloseOne, "__esModule", {
  value: true
});
var default_1$13 = CloseOne.default = void 0;

var _vue$13 = require$$0;

var _runtime$13 = runtime;

var _default$13 = (0, _runtime$13.IconWrapper)('close-one', false, function (props) {
  return (0, _vue$13.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$13.createVNode)("path", {
    "d": "M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$13.createVNode)("path", {
    "d": "M29.6567 18.3432L18.343 29.6569",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$13.createVNode)("path", {
    "d": "M18.3433 18.3432L29.657 29.6569",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$13 = CloseOne.default = _default$13;

var CloseSmall = {};

Object.defineProperty(CloseSmall, "__esModule", {
  value: true
});
var default_1$12 = CloseSmall.default = void 0;

var _vue$12 = require$$0;

var _runtime$12 = runtime;

var _default$12 = (0, _runtime$12.IconWrapper)('close-small', false, function (props) {
  return (0, _vue$12.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$12.createVNode)("path", {
    "d": "M14 14L34 34",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$12.createVNode)("path", {
    "d": "M14 34L34 14",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$12 = CloseSmall.default = _default$12;

var Code = {};

Object.defineProperty(Code, "__esModule", {
  value: true
});
var default_1$11 = Code.default = void 0;

var _vue$11 = require$$0;

var _runtime$11 = runtime;

var _default$11 = (0, _runtime$11.IconWrapper)('code', true, function (props) {
  return (0, _vue$11.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$11.createVNode)("path", {
    "d": "M16 13L4 25.4322L16 37",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$11.createVNode)("path", {
    "d": "M32 13L44 25.4322L32 37",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$11.createVNode)("path", {
    "d": "M28 4L21 44",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$11 = Code.default = _default$11;

var Copy = {};

Object.defineProperty(Copy, "__esModule", {
  value: true
});
var default_1$10 = Copy.default = void 0;

var _vue$10 = require$$0;

var _runtime$10 = runtime;

var _default$10 = (0, _runtime$10.IconWrapper)('copy', true, function (props) {
  return (0, _vue$10.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$10.createVNode)("path", {
    "d": "M13 12.4316V7.8125C13 6.2592 14.2592 5 15.8125 5H40.1875C41.7408 5 43 6.2592 43 7.8125V32.1875C43 33.7408 41.7408 35 40.1875 35H35.5163",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$10.createVNode)("path", {
    "d": "M32.1875 13H7.8125C6.2592 13 5 14.2592 5 15.8125V40.1875C5 41.7408 6.2592 43 7.8125 43H32.1875C33.7408 43 35 41.7408 35 40.1875V15.8125C35 14.2592 33.7408 13 32.1875 13Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$10 = Copy.default = _default$10;

var CuttingOne = {};

Object.defineProperty(CuttingOne, "__esModule", {
  value: true
});
var default_1$$ = CuttingOne.default = void 0;

var _vue$$ = require$$0;

var _runtime$$ = runtime;

var _default$$ = (0, _runtime$$.IconWrapper)('cutting-one', false, function (props) {
  return (0, _vue$$.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$$.createVNode)("path", {
    "d": "M11 42C13.7614 42 16 39.7614 16 37C16 34.2386 13.7614 32 11 32C8.23858 32 6 34.2386 6 37C6 39.7614 8.23858 42 11 42Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$$.createVNode)("path", {
    "d": "M37 42C39.7614 42 42 39.7614 42 37C42 34.2386 39.7614 32 37 32C34.2386 32 32 34.2386 32 37C32 39.7614 34.2386 42 37 42Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$$.createVNode)("path", {
    "d": "M15.3774 39.4131L17.5 35.8162L34.5 6.37138",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$$.createVNode)("path", {
    "d": "M13.4957 6.17518L30.4957 35.62L32.6265 39.4131",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$$ = CuttingOne.default = _default$$;

var Data = {};

Object.defineProperty(Data, "__esModule", {
  value: true
});
var default_1$_ = Data.default = void 0;

var _vue$_ = require$$0;

var _runtime$_ = runtime;

var _default$_ = (0, _runtime$_.IconWrapper)('data', false, function (props) {
  return (0, _vue$_.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$_.createVNode)("path", {
    "d": "M44.0001 11C44.0001 11 44 36.0623 44 38C44 41.3137 35.0457 44 24 44C12.9543 44 4.00003 41.3137 4.00003 38C4.00003 36.1423 4 11 4 11",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$_.createVNode)("path", {
    "d": "M44 29C44 32.3137 35.0457 35 24 35C12.9543 35 4 32.3137 4 29",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$_.createVNode)("path", {
    "d": "M44 20C44 23.3137 35.0457 26 24 26C12.9543 26 4 23.3137 4 20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$_.createVNode)("ellipse", {
    "cx": "24",
    "cy": "10",
    "rx": "20",
    "ry": "6",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$_ = Data.default = _default$_;

var Delete = {};

Object.defineProperty(Delete, "__esModule", {
  value: true
});
var default_1$Z = Delete.default = void 0;

var _vue$Z = require$$0;

var _runtime$Z = runtime;

var _default$Z = (0, _runtime$Z.IconWrapper)('delete', false, function (props) {
  return (0, _vue$Z.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$Z.createVNode)("path", {
    "d": "M9 10V44H39V10H9Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$Z.createVNode)("path", {
    "d": "M20 20V33",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$Z.createVNode)("path", {
    "d": "M28 20V33",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$Z.createVNode)("path", {
    "d": "M4 10H44",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$Z.createVNode)("path", {
    "d": "M16 10L19.289 4H28.7771L32 10H16Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$Z = Delete.default = _default$Z;

var DeleteOne = {};

Object.defineProperty(DeleteOne, "__esModule", {
  value: true
});
var default_1$Y = DeleteOne.default = void 0;

var _vue$Y = require$$0;

var _runtime$Y = runtime;

var _default$Y = (0, _runtime$Y.IconWrapper)('delete-one', false, function (props) {
  return (0, _vue$Y.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$Y.createVNode)("path", {
    "d": "M15 12L16.2 5H31.8L33 12",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$Y.createVNode)("path", {
    "d": "M6 12H42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$Y.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M37 12L35 43H13L11 12H37Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$Y.createVNode)("path", {
    "d": "M19 35H29",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$Y = DeleteOne.default = _default$Y;

var DocumentFolder = {};

Object.defineProperty(DocumentFolder, "__esModule", {
  value: true
});
var default_1$X = DocumentFolder.default = void 0;

var _vue$X = require$$0;

var _runtime$X = runtime;

var _default$X = (0, _runtime$X.IconWrapper)('document-folder', true, function (props) {
  return (0, _vue$X.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$X.createVNode)("path", {
    "d": "M32 6H22V42H32V6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$X.createVNode)("path", {
    "d": "M42 6H32V42H42V6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$X.createVNode)("path", {
    "d": "M10 6L18 7L14.5 42L6 41L10 6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$X.createVNode)("path", {
    "d": "M37 18V15",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$X.createVNode)("path", {
    "d": "M27 18V15",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$X = DocumentFolder.default = _default$X;

var Dot = {};

Object.defineProperty(Dot, "__esModule", {
  value: true
});
var default_1$W = Dot.default = void 0;

var _vue$W = require$$0;

var _runtime$W = runtime;

var _default$W = (0, _runtime$W.IconWrapper)('dot', true, function (props) {
  return (0, _vue$W.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$W.createVNode)("path", {
    "d": "M24 33C28.9706 33 33 28.9706 33 24C33 19.0294 28.9706 15 24 15C19.0294 15 15 19.0294 15 24C15 28.9706 19.0294 33 24 33Z",
    "fill": props.colors[0],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null)]);
});

default_1$W = Dot.default = _default$W;

var Down = {};

Object.defineProperty(Down, "__esModule", {
  value: true
});
var default_1$V = Down.default = void 0;

var _vue$V = require$$0;

var _runtime$V = runtime;

var _default$V = (0, _runtime$V.IconWrapper)('down', false, function (props) {
  return (0, _vue$V.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$V.createVNode)("path", {
    "d": "M36 18L24 30L12 18",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$V = Down.default = _default$V;

var Download = {};

Object.defineProperty(Download, "__esModule", {
  value: true
});
var default_1$U = Download.default = void 0;

var _vue$U = require$$0;

var _runtime$U = runtime;

var _default$U = (0, _runtime$U.IconWrapper)('download', false, function (props) {
  return (0, _vue$U.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$U.createVNode)("path", {
    "d": "M6 24.0083V42H42V24",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$U.createVNode)("path", {
    "d": "M33 23L24 32L15 23",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$U.createVNode)("path", {
    "d": "M23.9917 6V32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$U = Download.default = _default$U;

var Edit = {};

Object.defineProperty(Edit, "__esModule", {
  value: true
});
var default_1$T = Edit.default = void 0;

var _vue$T = require$$0;

var _runtime$T = runtime;

var _default$T = (0, _runtime$T.IconWrapper)('edit', true, function (props) {
  return (0, _vue$T.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$T.createVNode)("path", {
    "d": "M7 42H43",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$T.createVNode)("path", {
    "d": "M11 26.7199V34H18.3172L39 13.3081L31.6951 6L11 26.7199Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$T = Edit.default = _default$T;

var Editing = {};

Object.defineProperty(Editing, "__esModule", {
  value: true
});
var default_1$S = Editing.default = void 0;

var _vue$S = require$$0;

var _runtime$S = runtime;

var _default$S = (0, _runtime$S.IconWrapper)('editing', false, function (props) {
  return (0, _vue$S.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$S.createVNode)("circle", {
    "cx": "13",
    "cy": "35",
    "r": "7",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null), (0, _vue$S.createVNode)("circle", {
    "cx": "35",
    "cy": "35",
    "r": "7",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null), (0, _vue$S.createVNode)("path", {
    "d": "M8 6L32 28",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$S.createVNode)("path", {
    "d": "M40 6L16 28",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$S = Editing.default = _default$S;

var Editor = {};

Object.defineProperty(Editor, "__esModule", {
  value: true
});
var default_1$R = Editor.default = void 0;

var _vue$R = require$$0;

var _runtime$R = runtime;

var _default$R = (0, _runtime$R.IconWrapper)('editor', true, function (props) {
  return (0, _vue$R.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$R.createVNode)("path", {
    "d": "M40 33V42C40 43.1046 39.1046 44 38 44H31.5",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$R.createVNode)("path", {
    "d": "M40 16V6C40 4.89543 39.1046 4 38 4H10C8.89543 4 8 4.89543 8 6V42C8 43.1046 8.89543 44 10 44H16",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$R.createVNode)("path", {
    "d": "M16 16H30",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$R.createVNode)("path", {
    "d": "M23 44L40 23",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$R.createVNode)("path", {
    "d": "M16 24H24",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$R = Editor.default = _default$R;

var Exchange = {};

Object.defineProperty(Exchange, "__esModule", {
  value: true
});
var default_1$Q = Exchange.default = void 0;

var _vue$Q = require$$0;

var _runtime$Q = runtime;

var _default$Q = (0, _runtime$Q.IconWrapper)('exchange', true, function (props) {
  return (0, _vue$Q.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$Q.createVNode)("path", {
    "d": "M24 16H29V4L44 19L29 34V24H18V13L4 28L18 44V32H23",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$Q = Exchange.default = _default$Q;

var ExpandTextInput = {};

Object.defineProperty(ExpandTextInput, "__esModule", {
  value: true
});
var default_1$P = ExpandTextInput.default = void 0;

var _vue$P = require$$0;

var _runtime$P = runtime;

var _default$P = (0, _runtime$P.IconWrapper)('expand-text-input', true, function (props) {
  return (0, _vue$P.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$P.createVNode)("path", {
    "d": "M22 42H6V26",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$P.createVNode)("path", {
    "d": "M26 6H42V22",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$P = ExpandTextInput.default = _default$P;

var Export = {};

Object.defineProperty(Export, "__esModule", {
  value: true
});
var default_1$O = Export.default = void 0;

var _vue$O = require$$0;

var _runtime$O = runtime;

var _default$O = (0, _runtime$O.IconWrapper)('export', true, function (props) {
  return (0, _vue$O.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$O.createVNode)("path", {
    "d": "M42 27C42 33 38 43 24 43C10 43 6 33 6 27",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$O.createVNode)("path", {
    "d": "M24.0078 5.10059V33.0001",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$O.createVNode)("path", {
    "d": "M12 17L24 5L36 17",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$O = Export.default = _default$O;

var FileText = {};

Object.defineProperty(FileText, "__esModule", {
  value: true
});
var default_1$N = FileText.default = void 0;

var _vue$N = require$$0;

var _runtime$N = runtime;

var _default$N = (0, _runtime$N.IconWrapper)('file-text', true, function (props) {
  return (0, _vue$N.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$N.createVNode)("path", {
    "d": "M10 44H38C39.1046 44 40 43.1046 40 42V14H30V4H10C8.89543 4 8 4.89543 8 6V42C8 43.1046 8.89543 44 10 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$N.createVNode)("path", {
    "d": "M30 4L40 14",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$N.createVNode)("path", {
    "d": "M24 22V36",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$N.createVNode)("path", {
    "d": "M18 22H24L30 22",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$N = FileText.default = _default$N;

var Film = {};

Object.defineProperty(Film, "__esModule", {
  value: true
});
var default_1$M = Film.default = void 0;

var _vue$M = require$$0;

var _runtime$M = runtime;

var _default$M = (0, _runtime$M.IconWrapper)('film', false, function (props) {
  return (0, _vue$M.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$M.createVNode)("rect", {
    "x": "6",
    "y": "6",
    "width": "36",
    "height": "36",
    "rx": "3",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M16 6V42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M32 6V42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M6 15H16",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M32 15H42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M6 33H16",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M6 24H42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$M.createVNode)("path", {
    "d": "M32 33H42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$M = Film.default = _default$M;

var FlashPayment = {};

Object.defineProperty(FlashPayment, "__esModule", {
  value: true
});
var default_1$L = FlashPayment.default = void 0;

var _vue$L = require$$0;

var _runtime$L = runtime;

var _default$L = (0, _runtime$L.IconWrapper)('flash-payment', true, function (props) {
  return (0, _vue$L.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$L.createVNode)("path", {
    "d": "M31 4H16L10 27H18L14 44L40 16H28L31 4Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$L.createVNode)("path", {
    "d": "M21 11L19 19",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$L = FlashPayment.default = _default$L;

var FolderOpen = {};

Object.defineProperty(FolderOpen, "__esModule", {
  value: true
});
var default_1$K = FolderOpen.default = void 0;

var _vue$K = require$$0;

var _runtime$K = runtime;

var _default$K = (0, _runtime$K.IconWrapper)('folder-open', true, function (props) {
  return (0, _vue$K.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$K.createVNode)("path", {
    "d": "M4 9V41L9 21H39.5V15C39.5 13.8954 38.6046 13 37.5 13H24L19 7H6C4.89543 7 4 7.89543 4 9Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$K.createVNode)("path", {
    "d": "M40 41L44 21H8.8125L4 41H40Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$K = FolderOpen.default = _default$K;

var FullScreenOne = {};

Object.defineProperty(FullScreenOne, "__esModule", {
  value: true
});
var default_1$J = FullScreenOne.default = void 0;

var _vue$J = require$$0;

var _runtime$J = runtime;

var _default$J = (0, _runtime$J.IconWrapper)('full-screen-one', false, function (props) {
  return (0, _vue$J.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$J.createVNode)("path", {
    "d": "M6 6L16 15.8995",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M6 41.8995L16 32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M42.0001 41.8995L32.1006 32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M41.8995 6L32 15.8995",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M33 6H42V15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M42 33V42H33",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M15 42H6V33",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$J.createVNode)("path", {
    "d": "M6 15V6H15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$J = FullScreenOne.default = _default$J;

var Github = {};

Object.defineProperty(Github, "__esModule", {
  value: true
});
var default_1$I = Github.default = void 0;

var _vue$I = require$$0;

var _runtime$I = runtime;

var _default$I = (0, _runtime$I.IconWrapper)('github', true, function (props) {
  return (0, _vue$I.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$I.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4ZM0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z",
    "fill": props.colors[0]
  }, null), (0, _vue$I.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M19.1833 45.4716C18.9898 45.2219 18.9898 42.9973 19.1833 38.798C17.1114 38.8696 15.8024 38.7258 15.2563 38.3667C14.437 37.828 13.6169 36.1667 12.8891 34.9959C12.1614 33.8251 10.5463 33.64 9.89405 33.3783C9.24182 33.1165 9.07809 32.0496 11.6913 32.8565C14.3044 33.6634 14.4319 35.8607 15.2563 36.3745C16.0806 36.8883 18.0515 36.6635 18.9448 36.2519C19.8382 35.8403 19.7724 34.3078 19.9317 33.7007C20.1331 33.134 19.4233 33.0083 19.4077 33.0037C18.5355 33.0037 13.9539 32.0073 12.6955 27.5706C11.437 23.134 13.0581 20.2341 13.9229 18.9875C14.4995 18.1564 14.4485 16.3852 13.7699 13.6737C16.2335 13.3589 18.1347 14.1343 19.4734 16.0001C19.4747 16.0108 21.2285 14.9572 24.0003 14.9572C26.772 14.9572 27.7553 15.8154 28.5142 16.0001C29.2731 16.1848 29.88 12.7341 34.5668 13.6737C33.5883 15.5969 32.7689 18.0001 33.3943 18.9875C34.0198 19.9749 36.4745 23.1147 34.9666 27.5706C33.9614 30.5413 31.9853 32.3523 29.0384 33.0037C28.7005 33.1115 28.5315 33.2855 28.5315 33.5255C28.5315 33.8856 28.9884 33.9249 29.6465 35.6117C30.0853 36.7362 30.117 39.948 29.7416 45.247C28.7906 45.4891 28.0508 45.6516 27.5221 45.7347C26.5847 45.882 25.5669 45.9646 24.5669 45.9965C23.5669 46.0284 23.2196 46.0248 21.837 45.8961C20.9154 45.8103 20.0308 45.6688 19.1833 45.4716Z",
    "fill": props.colors[0]
  }, null)]);
});

default_1$I = Github.default = _default$I;

var GithubOne = {};

Object.defineProperty(GithubOne, "__esModule", {
  value: true
});
var default_1$H = GithubOne.default = void 0;

var _vue$H = require$$0;

var _runtime$H = runtime;

var _default$H = (0, _runtime$H.IconWrapper)('github-one', true, function (props) {
  return (0, _vue$H.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$H.createVNode)("path", {
    "d": "M29.3444 30.4765C31.7481 29.977 33.9292 29.1108 35.6247 27.8391C38.5202 25.6676 40 22.3136 40 18.9999C40 16.6752 39.1187 14.505 37.5929 12.6668C36.7427 11.6425 39.2295 3.99989 37.02 5.02919C34.8105 6.05848 31.5708 8.33679 29.8726 7.83398C28.0545 7.29565 26.0733 6.99989 24 6.99989C22.1992 6.99989 20.4679 7.22301 18.8526 7.6344C16.5046 8.23237 14.2591 5.99989 12 5.02919C9.74086 4.05848 10.9736 11.9632 10.3026 12.7944C8.84119 14.6051 8 16.7288 8 18.9999C8 22.3136 9.79086 25.6676 12.6863 27.8391C14.6151 29.2857 17.034 30.2076 19.7401 30.6619",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$H.createVNode)("path", {
    "d": "M19.7397 30.6619C18.5812 31.937 18.002 33.1478 18.002 34.2944C18.002 35.441 18.002 38.3464 18.002 43.0106",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$H.createVNode)("path", {
    "d": "M29.3446 30.4766C30.4423 31.9174 30.9912 33.211 30.9912 34.3576C30.9912 35.5042 30.9912 38.3885 30.9912 43.0107",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null), (0, _vue$H.createVNode)("path", {
    "d": "M6 31.2155C6.89887 31.3254 7.56554 31.7387 8 32.4554C8.65169 33.5303 11.0742 37.518 13.8251 37.518C15.6591 37.518 17.0515 37.518 18.0024 37.518",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1$H = GithubOne.default = _default$H;

var GoEnd = {};

Object.defineProperty(GoEnd, "__esModule", {
  value: true
});
var default_1$G = GoEnd.default = void 0;

var _vue$G = require$$0;

var _runtime$G = runtime;

var _default$G = (0, _runtime$G.IconWrapper)('go-end', true, function (props) {
  return (0, _vue$G.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$G.createVNode)("path", {
    "d": "M14 12L26 24L14 36",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$G.createVNode)("path", {
    "d": "M34 12V36",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$G = GoEnd.default = _default$G;

var GoStart = {};

Object.defineProperty(GoStart, "__esModule", {
  value: true
});
var default_1$F = GoStart.default = void 0;

var _vue$F = require$$0;

var _runtime$F = runtime;

var _default$F = (0, _runtime$F.IconWrapper)('go-start', true, function (props) {
  return (0, _vue$F.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$F.createVNode)("path", {
    "d": "M34 36L22 24L34 12",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$F.createVNode)("path", {
    "d": "M14 12V36",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$F = GoStart.default = _default$F;

var GoodTwo = {};

Object.defineProperty(GoodTwo, "__esModule", {
  value: true
});
var default_1$E = GoodTwo.default = void 0;

var _vue$E = require$$0;

var _runtime$E = runtime;

var _default$E = (0, _runtime$E.IconWrapper)('good-two', true, function (props) {
  return (0, _vue$E.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$E.createVNode)("path", {
    "d": "M4.18898 22.1733C4.08737 21.0047 5.00852 20 6.18146 20H10C11.1046 20 12 20.8954 12 22V41C12 42.1046 11.1046 43 10 43H7.83363C6.79622 43 5.93102 42.2068 5.84115 41.1733L4.18898 22.1733Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$E.createVNode)("path", {
    "d": "M18 21.3745C18 20.5388 18.5194 19.7908 19.2753 19.4345C20.9238 18.6574 23.7329 17.0938 25 14.9805C26.6331 12.2569 26.9411 7.33595 26.9912 6.20878C26.9982 6.05099 26.9937 5.89301 27.0154 5.73656C27.2861 3.78446 31.0543 6.06492 32.5 8.47612C33.2846 9.78471 33.3852 11.504 33.3027 12.8463C33.2144 14.2825 32.7933 15.6699 32.3802 17.0483L31.5 19.9845H42.3569C43.6832 19.9845 44.6421 21.2518 44.2816 22.5281L38.9113 41.5436C38.668 42.4051 37.8818 43 36.9866 43H20C18.8954 43 18 42.1046 18 41V21.3745Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$E = GoodTwo.default = _default$E;

var Inbox = {};

Object.defineProperty(Inbox, "__esModule", {
  value: true
});
var default_1$D = Inbox.default = void 0;

var _vue$D = require$$0;

var _runtime$D = runtime;

var _default$D = (0, _runtime$D.IconWrapper)('inbox', false, function (props) {
  return (0, _vue$D.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$D.createVNode)("path", {
    "d": "M4 30L9 6H39L44 30",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$D.createVNode)("path", {
    "d": "M4 30H14.9091L16.7273 36H31.2727L33.0909 30H44V43H4V30Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$D.createVNode)("path", {
    "d": "M19 14H29",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$D.createVNode)("path", {
    "d": "M16 22H32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$D = Inbox.default = _default$D;

var Lightning = {};

Object.defineProperty(Lightning, "__esModule", {
  value: true
});
var default_1$C = Lightning.default = void 0;

var _vue$C = require$$0;

var _runtime$C = runtime;

var _default$C = (0, _runtime$C.IconWrapper)('lightning', true, function (props) {
  return (0, _vue$C.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$C.createVNode)("path", {
    "d": "M19 4H37L26 18H41L17 44L22 25H8L19 4Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$C = Lightning.default = _default$C;

var LoadingFour = {};

Object.defineProperty(LoadingFour, "__esModule", {
  value: true
});
var default_1$B = LoadingFour.default = void 0;

var _vue$B = require$$0;

var _runtime$B = runtime;

var _default$B = (0, _runtime$B.IconWrapper)('loading-four', true, function (props) {
  return (0, _vue$B.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$B.createVNode)("path", {
    "d": "M4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$B = LoadingFour.default = _default$B;

var Magic = {};

Object.defineProperty(Magic, "__esModule", {
  value: true
});
var default_1$A = Magic.default = void 0;

var _vue$A = require$$0;

var _runtime$A = runtime;

var _default$A = (0, _runtime$A.IconWrapper)('magic', true, function (props) {
  return (0, _vue$A.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$A.createVNode)("path", {
    "d": "M20.1005 8.1005L24.3431 12.3431M30 4V10V4ZM39.8995 8.1005L35.6569 12.3431L39.8995 8.1005ZM44 18H38H44ZM39.8995 27.8995L35.6569 23.6569L39.8995 27.8995ZM30 32V26V32ZM20.1005 27.8995L24.3431 23.6569L20.1005 27.8995ZM16 18H22H16Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$A.createVNode)("path", {
    "d": "M29.5856 18.4143L5.54395 42.4559",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$A = Magic.default = _default$A;

var MenuUnfoldOne = {};

Object.defineProperty(MenuUnfoldOne, "__esModule", {
  value: true
});
var default_1$z = MenuUnfoldOne.default = void 0;

var _vue$z = require$$0;

var _runtime$z = runtime;

var _default$z = (0, _runtime$z.IconWrapper)('menu-unfold-one', true, function (props) {
  return (0, _vue$z.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$z.createVNode)("path", {
    "d": "M8 10.5H40",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$z.createVNode)("path", {
    "d": "M24 19.5H40",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$z.createVNode)("path", {
    "d": "M24 28.5H40",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$z.createVNode)("path", {
    "d": "M8 37.5H40",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$z.createVNode)("path", {
    "d": "M16 19L8 24L16 29V19Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$z = MenuUnfoldOne.default = _default$z;

var Music = {};

Object.defineProperty(Music, "__esModule", {
  value: true
});
var default_1$y = Music.default = void 0;

var _vue$y = require$$0;

var _runtime$y = runtime;

var _default$y = (0, _runtime$y.IconWrapper)('music', true, function (props) {
  return (0, _vue$y.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$y.createVNode)("path", {
    "d": "M30 34.5C30 32.567 31.567 31 33.5 31H41V34.4C41 36.3882 39.3882 38 37.4 38H33.5C31.567 38 30 36.433 30 34.5Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$y.createVNode)("path", {
    "d": "M6 38.5C6 36.567 7.567 35 9.5 35H16V38.4C16 40.3882 14.3882 42 12.4 42H9.5C7.567 42 6 40.433 6 38.5Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$y.createVNode)("path", {
    "d": "M16 18.044V18.044L41 12.125",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$y.createVNode)("path", {
    "d": "M16 38V10L41 4V33.6924",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$y = Music.default = _default$y;

var MusicOne = {};

Object.defineProperty(MusicOne, "__esModule", {
  value: true
});
var default_1$x = MusicOne.default = void 0;

var _vue$x = require$$0;

var _runtime$x = runtime;

var _default$x = (0, _runtime$x.IconWrapper)('music-one', true, function (props) {
  return (0, _vue$x.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$x.createVNode)("path", {
    "d": "M24 6V35",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$x.createVNode)("path", {
    "d": "M10 36.04C10 33.2565 12.2565 31 15.04 31H24V36.96C24 39.7435 21.7435 42 18.96 42H15.04C12.2565 42 10 39.7435 10 36.96V36.04Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$x.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M24 14.0664L36.8834 17.1215V9.01341L24 6.00002V14.0664Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$x = MusicOne.default = _default$x;

var Notes = {};

Object.defineProperty(Notes, "__esModule", {
  value: true
});
var default_1$w = Notes.default = void 0;

var _vue$w = require$$0;

var _runtime$w = runtime;

var _default$w = (0, _runtime$w.IconWrapper)('notes', true, function (props) {
  return (0, _vue$w.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$w.createVNode)("path", {
    "d": "M8 6C8 4.89543 8.89543 4 10 4H30L40 14V42C40 43.1046 39.1046 44 38 44H10C8.89543 44 8 43.1046 8 42V6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$w.createVNode)("path", {
    "d": "M16 20H32",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$w.createVNode)("path", {
    "d": "M16 28H32",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$w = Notes.default = _default$w;

var Pencil = {};

Object.defineProperty(Pencil, "__esModule", {
  value: true
});
var default_1$v = Pencil.default = void 0;

var _vue$v = require$$0;

var _runtime$v = runtime;

var _default$v = (0, _runtime$v.IconWrapper)('pencil', true, function (props) {
  return (0, _vue$v.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$v.createVNode)("g", {
    "clip-path": 'url(#' + props.id + '5aa51f38' + ')'
  }, [(0, _vue$v.createVNode)("path", {
    "d": "M30.9995 8.99902L38.9995 16.999",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$v.createVNode)("path", {
    "d": "M7.99953 31.999L35.9994 4L43.9995 11.999L15.9995 39.999L5.99951 41.999L7.99953 31.999Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$v.createVNode)("path", {
    "d": "M30.9995 8.99902L38.9995 16.999",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$v.createVNode)("path", {
    "d": "M8.99951 31.999L15.9995 38.999",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$v.createVNode)("path", {
    "d": "M12.9995 34.999L34.9995 12.999",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]), (0, _vue$v.createVNode)("defs", null, [(0, _vue$v.createVNode)("clipPath", {
    "id": props.id + '5aa51f38'
  }, [(0, _vue$v.createVNode)("rect", {
    "width": "48",
    "height": "48",
    "fill": props.colors[2]
  }, null)])])]);
});

default_1$v = Pencil.default = _default$v;

var Pic = {};

Object.defineProperty(Pic, "__esModule", {
  value: true
});
var default_1$u = Pic.default = void 0;

var _vue$u = require$$0;

var _runtime$u = runtime;

var _default$u = (0, _runtime$u.IconWrapper)('pic', true, function (props) {
  return (0, _vue$u.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$u.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M5 10C5 8.89543 5.89543 8 7 8L41 8C42.1046 8 43 8.89543 43 10V38C43 39.1046 42.1046 40 41 40H7C5.89543 40 5 39.1046 5 38V10Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$u.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M14.5 18C15.3284 18 16 17.3284 16 16.5C16 15.6716 15.3284 15 14.5 15C13.6716 15 13 15.6716 13 16.5C13 17.3284 13.6716 18 14.5 18Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$u.createVNode)("path", {
    "d": "M15 24L20 28L26 21L43 34V38C43 39.1046 42.1046 40 41 40H7C5.89543 40 5 39.1046 5 38V34L15 24Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$u = Pic.default = _default$u;

var Picture = {};

Object.defineProperty(Picture, "__esModule", {
  value: true
});
var default_1$t = Picture.default = void 0;

var _vue$t = require$$0;

var _runtime$t = runtime;

var _default$t = (0, _runtime$t.IconWrapper)('picture', true, function (props) {
  return (0, _vue$t.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$t.createVNode)("path", {
    "d": "M39 6H9C7.34315 6 6 7.34315 6 9V39C6 40.6569 7.34315 42 9 42H39C40.6569 42 42 40.6569 42 39V9C42 7.34315 40.6569 6 39 6Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$t.createVNode)("path", {
    "d": "M18 23C20.7614 23 23 20.7614 23 18C23 15.2386 20.7614 13 18 13C15.2386 13 13 15.2386 13 18C13 20.7614 15.2386 23 18 23Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$t.createVNode)("path", {
    "d": "M27.7901 26.2194C28.6064 25.1269 30.2528 25.1538 31.0329 26.2725L39.8077 38.8561C40.7322 40.182 39.7835 42.0001 38.1671 42.0001H16L27.7901 26.2194Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$t = Picture.default = _default$t;

var Play = {};

Object.defineProperty(Play, "__esModule", {
  value: true
});
var default_1$s = Play.default = void 0;

var _vue$s = require$$0;

var _runtime$s = runtime;

var _default$s = (0, _runtime$s.IconWrapper)('play', true, function (props) {
  return (0, _vue$s.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$s.createVNode)("path", {
    "d": "M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$s.createVNode)("path", {
    "d": "M20 24V17.0718L26 20.5359L32 24L26 27.4641L20 30.9282V24Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$s = Play.default = _default$s;

var PlaybackProgress = {};

Object.defineProperty(PlaybackProgress, "__esModule", {
  value: true
});
var default_1$r = PlaybackProgress.default = void 0;

var _vue$r = require$$0;

var _runtime$r = runtime;

var _default$r = (0, _runtime$r.IconWrapper)('playback-progress', true, function (props) {
  return (0, _vue$r.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$r.createVNode)("rect", {
    "x": "4",
    "y": "5",
    "width": "40",
    "height": "26",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$r.createVNode)("path", {
    "d": "M22 14L28 18L22 22V14Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$r.createVNode)("path", {
    "d": "M11 40H6",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$r.createVNode)("path", {
    "d": "M17 40H42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$r.createVNode)("path", {
    "d": "M17 40C17 41.6569 15.6569 43 14 43C12.3431 43 11 41.6569 11 40C11 38.3431 12.3431 37 14 37C15.6569 37 17 38.3431 17 40Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$r = PlaybackProgress.default = _default$r;

var Plus = {};

Object.defineProperty(Plus, "__esModule", {
  value: true
});
var default_1$q = Plus.default = void 0;

var _vue$q = require$$0;

var _runtime$q = runtime;

var _default$q = (0, _runtime$q.IconWrapper)('plus', false, function (props) {
  return (0, _vue$q.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$q.createVNode)("path", {
    "d": "M24.0605 10L24.0239 38",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$q.createVNode)("path", {
    "d": "M10 24L38 24",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$q = Plus.default = _default$q;

var PreviewOpen = {};

Object.defineProperty(PreviewOpen, "__esModule", {
  value: true
});
var default_1$p = PreviewOpen.default = void 0;

var _vue$p = require$$0;

var _runtime$p = runtime;

var _default$p = (0, _runtime$p.IconWrapper)('preview-open', false, function (props) {
  return (0, _vue$p.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$p.createVNode)("path", {
    "d": "M24 36C35.0457 36 44 24 44 24C44 24 35.0457 12 24 12C12.9543 12 4 24 4 24C4 24 12.9543 36 24 36Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$p.createVNode)("path", {
    "d": "M24 29C26.7614 29 29 26.7614 29 24C29 21.2386 26.7614 19 24 19C21.2386 19 19 21.2386 19 24C19 26.7614 21.2386 29 24 29Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$p = PreviewOpen.default = _default$p;

var Redo = {};

Object.defineProperty(Redo, "__esModule", {
  value: true
});
var default_1$o = Redo.default = void 0;

var _vue$o = require$$0;

var _runtime$o = runtime;

var _default$o = (0, _runtime$o.IconWrapper)('redo', true, function (props) {
  return (0, _vue$o.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$o.createVNode)("path", {
    "d": "M36.7279 36.7279C33.4706 39.9853 28.9706 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C28.9706 6 33.4706 8.01472 36.7279 11.2721C38.3859 12.9301 42 17 42 17",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$o.createVNode)("path", {
    "d": "M42 8V17H33",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$o = Redo.default = _default$o;

var ReduceOne = {};

Object.defineProperty(ReduceOne, "__esModule", {
  value: true
});
var default_1$n = ReduceOne.default = void 0;

var _vue$n = require$$0;

var _runtime$n = runtime;

var _default$n = (0, _runtime$n.IconWrapper)('reduce-one', false, function (props) {
  return (0, _vue$n.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$n.createVNode)("path", {
    "d": "M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$n.createVNode)("path", {
    "d": "M16 24L32 24",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$n = ReduceOne.default = _default$n;

var Refresh = {};

Object.defineProperty(Refresh, "__esModule", {
  value: true
});
var default_1$m = Refresh.default = void 0;

var _vue$m = require$$0;

var _runtime$m = runtime;

var _default$m = (0, _runtime$m.IconWrapper)('refresh', true, function (props) {
  return (0, _vue$m.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$m.createVNode)("path", {
    "d": "M42 8V24",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$m.createVNode)("path", {
    "d": "M6 24L6 40",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$m.createVNode)("path", {
    "d": "M42 24C42 14.0589 33.9411 6 24 6C18.9145 6 14.3216 8.10896 11.0481 11.5M6 24C6 33.9411 14.0589 42 24 42C28.8556 42 33.2622 40.0774 36.5 36.9519",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$m = Refresh.default = _default$m;

var Right = {};

Object.defineProperty(Right, "__esModule", {
  value: true
});
var default_1$l = Right.default = void 0;

var _vue$l = require$$0;

var _runtime$l = runtime;

var _default$l = (0, _runtime$l.IconWrapper)('right', true, function (props) {
  return (0, _vue$l.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$l.createVNode)("path", {
    "d": "M19 12L31 24L19 36",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$l = Right.default = _default$l;

var Round = {};

Object.defineProperty(Round, "__esModule", {
  value: true
});
var default_1$k = Round.default = void 0;

var _vue$k = require$$0;

var _runtime$k = runtime;

var _default$k = (0, _runtime$k.IconWrapper)('round', false, function (props) {
  return (0, _vue$k.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$k.createVNode)("circle", {
    "cx": "24",
    "cy": "24",
    "r": "20",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null)]);
});

default_1$k = Round.default = _default$k;

var Save = {};

Object.defineProperty(Save, "__esModule", {
  value: true
});
var default_1$j = Save.default = void 0;

var _vue$j = require$$0;

var _runtime$j = runtime;

var _default$j = (0, _runtime$j.IconWrapper)('save', true, function (props) {
  return (0, _vue$j.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$j.createVNode)("path", {
    "d": "M6 9C6 7.34315 7.34315 6 9 6H34.2814L42 13.2065V39C42 40.6569 40.6569 42 39 42H9C7.34315 42 6 40.6569 6 39V9Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$j.createVNode)("path", {
    "fill-rule": "evenodd",
    "clip-rule": "evenodd",
    "d": "M24.0083 6L24 13.3846C24 13.7245 23.5523 14 23 14H15C14.4477 14 14 13.7245 14 13.3846L14 6",
    "fill": props.colors[3]
  }, null), (0, _vue$j.createVNode)("path", {
    "d": "M24.0083 6L24 13.3846C24 13.7245 23.5523 14 23 14H15C14.4477 14 14 13.7245 14 13.3846L14 6H24.0083Z",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$j.createVNode)("path", {
    "d": "M9 6H34.2814",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$j.createVNode)("path", {
    "d": "M14 26H34",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$j.createVNode)("path", {
    "d": "M14 34H24.0083",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$j = Save.default = _default$j;

var Search = {};

Object.defineProperty(Search, "__esModule", {
  value: true
});
var default_1$i = Search.default = void 0;

var _vue$i = require$$0;

var _runtime$i = runtime;

var _default$i = (0, _runtime$i.IconWrapper)('search', true, function (props) {
  return (0, _vue$i.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$i.createVNode)("path", {
    "d": "M21 38C30.3888 38 38 30.3888 38 21C38 11.6112 30.3888 4 21 4C11.6112 4 4 11.6112 4 21C4 30.3888 11.6112 38 21 38Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$i.createVNode)("path", {
    "d": "M26.657 14.3431C25.2093 12.8954 23.2093 12 21.0001 12C18.791 12 16.791 12.8954 15.3433 14.3431",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$i.createVNode)("path", {
    "d": "M33.2216 33.2217L41.7069 41.707",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$i = Search.default = _default$i;

var Send = {};

Object.defineProperty(Send, "__esModule", {
  value: true
});
var default_1$h = Send.default = void 0;

var _vue$h = require$$0;

var _runtime$h = runtime;

var _default$h = (0, _runtime$h.IconWrapper)('send', true, function (props) {
  return (0, _vue$h.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$h.createVNode)("path", {
    "d": "M43 5L29.7 43L22.1 25.9L5 18.3L43 5Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$h.createVNode)("path", {
    "d": "M43.0001 5L22.1001 25.9",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$h = Send.default = _default$h;

var SettingConfig = {};

Object.defineProperty(SettingConfig, "__esModule", {
  value: true
});
var default_1$g = SettingConfig.default = void 0;

var _vue$g = require$$0;

var _runtime$g = runtime;

var _default$g = (0, _runtime$g.IconWrapper)('setting-config', true, function (props) {
  return (0, _vue$g.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$g.createVNode)("path", {
    "d": "M41.5 10H35.5",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M27.5 6V14",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M27.5 10L5.5 10",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M13.5 24H5.5",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M21.5 20V28",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M43.5 24H21.5",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M41.5 38H35.5",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M27.5 34V42",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$g.createVNode)("path", {
    "d": "M27.5 38H5.5",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$g = SettingConfig.default = _default$g;

var SettingOne = {};

Object.defineProperty(SettingOne, "__esModule", {
  value: true
});
var default_1$f = SettingOne.default = void 0;

var _vue$f = require$$0;

var _runtime$f = runtime;

var _default$f = (0, _runtime$f.IconWrapper)('setting-one', false, function (props) {
  return (0, _vue$f.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$f.createVNode)("path", {
    "d": "M34.0003 41L44 24L34.0003 7H14.0002L4 24L14.0002 41H34.0003Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$f.createVNode)("path", {
    "d": "M24 29C26.7614 29 29 26.7614 29 24C29 21.2386 26.7614 19 24 19C21.2386 19 19 21.2386 19 24C19 26.7614 21.2386 29 24 29Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$f = SettingOne.default = _default$f;

var SettingTwo = {};

Object.defineProperty(SettingTwo, "__esModule", {
  value: true
});
var default_1$e = SettingTwo.default = void 0;

var _vue$e = require$$0;

var _runtime$e = runtime;

var _default$e = (0, _runtime$e.IconWrapper)('setting-two', false, function (props) {
  return (0, _vue$e.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$e.createVNode)("path", {
    "d": "M18.2838 43.1713C14.9327 42.1736 11.9498 40.3213 9.58787 37.867C10.469 36.8227 11 35.4734 11 34.0001C11 30.6864 8.31371 28.0001 5 28.0001C4.79955 28.0001 4.60139 28.01 4.40599 28.0292C4.13979 26.7277 4 25.3803 4 24.0001C4 21.9095 4.32077 19.8938 4.91579 17.9995C4.94381 17.9999 4.97188 18.0001 5 18.0001C8.31371 18.0001 11 15.3138 11 12.0001C11 11.0488 10.7786 10.1493 10.3846 9.35011C12.6975 7.1995 15.5205 5.59002 18.6521 4.72314C19.6444 6.66819 21.6667 8.00013 24 8.00013C26.3333 8.00013 28.3556 6.66819 29.3479 4.72314C32.4795 5.59002 35.3025 7.1995 37.6154 9.35011C37.2214 10.1493 37 11.0488 37 12.0001C37 15.3138 39.6863 18.0001 43 18.0001C43.0281 18.0001 43.0562 17.9999 43.0842 17.9995C43.6792 19.8938 44 21.9095 44 24.0001C44 25.3803 43.8602 26.7277 43.594 28.0292C43.3986 28.01 43.2005 28.0001 43 28.0001C39.6863 28.0001 37 30.6864 37 34.0001C37 35.4734 37.531 36.8227 38.4121 37.867C36.0502 40.3213 33.0673 42.1736 29.7162 43.1713C28.9428 40.752 26.676 39.0001 24 39.0001C21.324 39.0001 19.0572 40.752 18.2838 43.1713Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$e.createVNode)("path", {
    "d": "M24 31C27.866 31 31 27.866 31 24C31 20.134 27.866 17 24 17C20.134 17 17 20.134 17 24C17 27.866 20.134 31 24 31Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$e = SettingTwo.default = _default$e;

var Share = {};

Object.defineProperty(Share, "__esModule", {
  value: true
});
var default_1$d = Share.default = void 0;

var _vue$d = require$$0;

var _runtime$d = runtime;

var _default$d = (0, _runtime$d.IconWrapper)('share', true, function (props) {
  return (0, _vue$d.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$d.createVNode)("path", {
    "d": "M28 6H42V20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$d.createVNode)("path", {
    "d": "M42 29.4737V39C42 40.6569 40.6569 42 39 42H9C7.34315 42 6 40.6569 6 39V9C6 7.34315 7.34315 6 9 6L18 6",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$d.createVNode)("path", {
    "d": "M25.7998 22.1999L41.0998 6.8999",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$d = Share.default = _default$d;

var ThinkingProblem = {};

Object.defineProperty(ThinkingProblem, "__esModule", {
  value: true
});
var default_1$c = ThinkingProblem.default = void 0;

var _vue$c = require$$0;

var _runtime$c = runtime;

var _default$c = (0, _runtime$c.IconWrapper)('thinking-problem', true, function (props) {
  return (0, _vue$c.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$c.createVNode)("path", {
    "d": "M38 21L43 30L38 31V37H35L29 36L28 43H13L11 32.619C7.92077 29.7028 6 25.5757 6 21C6 12.1634 13.1634 5 22 5C30.8366 5 38 12.1634 38 21Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$c.createVNode)("path", {
    "d": "M17 19C17 16.2386 19.2386 14 22 14C24.7614 14 27 16.2386 27 19C27 21.7614 24.7614 24 22 24V27",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$c.createVNode)("path", {
    "d": "M22 33V34",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$c = ThinkingProblem.default = _default$c;

var Time = {};

Object.defineProperty(Time, "__esModule", {
  value: true
});
var default_1$b = Time.default = void 0;

var _vue$b = require$$0;

var _runtime$b = runtime;

var _default$b = (0, _runtime$b.IconWrapper)('time', true, function (props) {
  return (0, _vue$b.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$b.createVNode)("path", {
    "d": "M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$b.createVNode)("path", {
    "d": "M24.0084 12.0001L24.0072 24.0089L32.4866 32.4883",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$b = Time.default = _default$b;

var Tips = {};

Object.defineProperty(Tips, "__esModule", {
  value: true
});
var default_1$a = Tips.default = void 0;

var _vue$a = require$$0;

var _runtime$a = runtime;

var _default$a = (0, _runtime$a.IconWrapper)('tips', false, function (props) {
  return (0, _vue$a.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$a.createVNode)("path", {
    "d": "M40 20C40 26.8077 35.7484 32.6224 29.7555 34.9336H24H18.2445C12.2516 32.6224 8 26.8077 8 20C8 11.1634 15.1634 4 24 4C32.8366 4 40 11.1634 40 20Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$a.createVNode)("path", {
    "d": "M29.7557 34.9336L29.0766 43.0831C29.0334 43.6014 28.6001 44 28.08 44H19.9203C19.4002 44 18.9669 43.6014 18.9238 43.0831L18.2446 34.9336",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$a.createVNode)("path", {
    "d": "M18 17V23L24 20L30 23V17",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$a = Tips.default = _default$a;

var ToBottom = {};

Object.defineProperty(ToBottom, "__esModule", {
  value: true
});
var default_1$9 = ToBottom.default = void 0;

var _vue$9 = require$$0;

var _runtime$9 = runtime;

var _default$9 = (0, _runtime$9.IconWrapper)('to-bottom', false, function (props) {
  return (0, _vue$9.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$9.createVNode)("path", {
    "d": "M24.0083 33.8995V6",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$9.createVNode)("path", {
    "d": "M36 22L24 34L12 22",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$9.createVNode)("path", {
    "d": "M36 42H12",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$9 = ToBottom.default = _default$9;

var Translate = {};

Object.defineProperty(Translate, "__esModule", {
  value: true
});
var default_1$8 = Translate.default = void 0;

var _vue$8 = require$$0;

var _runtime$8 = runtime;

var _default$8 = (0, _runtime$8.IconWrapper)('translate', true, function (props) {
  return (0, _vue$8.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$8.createVNode)("path", {
    "d": "M28.2857 37H39.7143M42 42L39.7143 37L42 42ZM26 42L28.2857 37L26 42ZM28.2857 37L34 24L39.7143 37H28.2857Z",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$8.createVNode)("path", {
    "d": "M16 6L17 9",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$8.createVNode)("path", {
    "d": "M6 11H28",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$8.createVNode)("path", {
    "d": "M10 16C10 16 11.7895 22.2609 16.2632 25.7391C20.7368 29.2174 28 32 28 32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$8.createVNode)("path", {
    "d": "M24 11C24 11 22.2105 19.2174 17.7368 23.7826C13.2632 28.3478 6 32 6 32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$8 = Translate.default = _default$8;

var TreeDiagram = {};

Object.defineProperty(TreeDiagram, "__esModule", {
  value: true
});
var default_1$7 = TreeDiagram.default = void 0;

var _vue$7 = require$$0;

var _runtime$7 = runtime;

var _default$7 = (0, _runtime$7.IconWrapper)('tree-diagram', true, function (props) {
  return (0, _vue$7.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$7.createVNode)("circle", {
    "cx": "10",
    "cy": "24",
    "r": "4",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null), (0, _vue$7.createVNode)("circle", {
    "cx": "38",
    "cy": "10",
    "r": "4",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null), (0, _vue$7.createVNode)("circle", {
    "cx": "38",
    "cy": "24",
    "r": "4",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null), (0, _vue$7.createVNode)("circle", {
    "cx": "38",
    "cy": "38",
    "r": "4",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth
  }, null), (0, _vue$7.createVNode)("path", {
    "d": "M34 38L22 38V10H34",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$7.createVNode)("path", {
    "d": "M14 24L34 24",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$7 = TreeDiagram.default = _default$7;

var Undo = {};

Object.defineProperty(Undo, "__esModule", {
  value: true
});
var default_1$6 = Undo.default = void 0;

var _vue$6 = require$$0;

var _runtime$6 = runtime;

var _default$6 = (0, _runtime$6.IconWrapper)('undo', true, function (props) {
  return (0, _vue$6.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$6.createVNode)("path", {
    "d": "M11.2721 36.7279C14.5294 39.9853 19.0294 42 24 42C33.9411 42 42 33.9411 42 24C42 14.0589 33.9411 6 24 6C19.0294 6 14.5294 8.01472 11.2721 11.2721C9.61407 12.9301 6 17 6 17",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$6.createVNode)("path", {
    "d": "M6 9V17H14",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$6 = Undo.default = _default$6;

var Upload = {};

Object.defineProperty(Upload, "__esModule", {
  value: true
});
var default_1$5 = Upload.default = void 0;

var _vue$5 = require$$0;

var _runtime$5 = runtime;

var _default$5 = (0, _runtime$5.IconWrapper)('upload', false, function (props) {
  return (0, _vue$5.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$5.createVNode)("mask", {
    "id": props.id + '04cec2fa',
    "maskUnits": "userSpaceOnUse",
    "x": "0",
    "y": "0",
    "width": "48",
    "height": "48",
    "style": {
      maskType: 'alpha'
    }
  }, [(0, _vue$5.createVNode)("path", {
    "d": "M48 0H0V48H48V0Z",
    "fill": props.colors[2]
  }, null)]), (0, _vue$5.createVNode)("g", {
    "mask": 'url(#' + props.id + '04cec2fa' + ')'
  }, [(0, _vue$5.createVNode)("path", {
    "d": "M6 24.0083V42H42V24",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$5.createVNode)("path", {
    "d": "M33 15L24 6L15 15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$5.createVNode)("path", {
    "d": "M23.9917 32V6",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)])]);
});

default_1$5 = Upload.default = _default$5;

var UploadOne = {};

Object.defineProperty(UploadOne, "__esModule", {
  value: true
});
var default_1$4 = UploadOne.default = void 0;

var _vue$4 = require$$0;

var _runtime$4 = runtime;

var _default$4 = (0, _runtime$4.IconWrapper)('upload-one', true, function (props) {
  return (0, _vue$4.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$4.createVNode)("path", {
    "d": "M11.6777 20.271C7.27476 21.3181 4 25.2766 4 30C4 35.5228 8.47715 40 14 40C14.9474 40 15.864 39.8683 16.7325 39.6221",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$4.createVNode)("path", {
    "d": "M36.0547 20.271C40.4577 21.3181 43.7324 25.2766 43.7324 30C43.7324 35.5228 39.2553 40 33.7324 40C32.785 40 31.8684 39.8683 30.9999 39.6221",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$4.createVNode)("path", {
    "d": "M36 20C36 13.3726 30.6274 8 24 8C17.3726 8 12 13.3726 12 20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$4.createVNode)("path", {
    "d": "M17.0654 27.8812L23.9999 20.9238L31.1318 28.0002",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$4.createVNode)("path", {
    "d": "M24 38.0001V24.4619",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$4 = UploadOne.default = _default$4;

var Video$1 = {};

Object.defineProperty(Video$1, "__esModule", {
  value: true
});
var default_1$3 = Video$1.default = void 0;

var _vue$3 = require$$0;

var _runtime$3 = runtime;

var _default$3 = (0, _runtime$3.IconWrapper)('video', true, function (props) {
  return (0, _vue$3.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$3.createVNode)("path", {
    "d": "M4 10C4 8.89543 4.89543 8 6 8H42C43.1046 8 44 8.89543 44 10V38C44 39.1046 43.1046 40 42 40H6C4.89543 40 4 39.1046 4 38V10Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M36 8V40",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M12 8V40",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M38 18H44",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M38 30H44",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M4 18H10",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M4 16V20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M9 8H15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M9 40H15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M33 8H39",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M33 40H39",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M4 30H10",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M4 28V32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M44 28V32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M44 16V20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$3.createVNode)("path", {
    "d": "M21 19L29 24L21 29V19Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$3 = Video$1.default = _default$3;

var VideoOne = {};

Object.defineProperty(VideoOne, "__esModule", {
  value: true
});
var default_1$2 = VideoOne.default = void 0;

var _vue$2 = require$$0;

var _runtime$2 = runtime;

var _default$2 = (0, _runtime$2.IconWrapper)('video-one', true, function (props) {
  return (0, _vue$2.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$2.createVNode)("path", {
    "d": "M4 10C4 8.89543 4.89543 8 6 8H34C35.1046 8 36 8.89543 36 10V19L44 13V36L36 30V38C36 39.1046 35.1046 40 34 40H6C4.89543 40 4 39.1046 4 38V10Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$2.createVNode)("circle", {
    "cx": "17",
    "cy": "21",
    "r": "5",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$2 = VideoOne.default = _default$2;

var VolumeMute$1 = {};

Object.defineProperty(VolumeMute$1, "__esModule", {
  value: true
});
var default_1$1 = VolumeMute$1.default = void 0;

var _vue$1 = require$$0;

var _runtime$1 = runtime;

var _default$1 = (0, _runtime$1.IconWrapper)('volume-mute', true, function (props) {
  return (0, _vue$1.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue$1.createVNode)("rect", {
    "opacity": "0.01",
    "x": "30",
    "y": "18",
    "width": "13",
    "height": "13",
    "fill": props.colors[2]
  }, null), (0, _vue$1.createVNode)("mask", {
    "id": props.id + '603476ab',
    "maskUnits": "userSpaceOnUse",
    "x": "30",
    "y": "18",
    "width": "13",
    "height": "13",
    "style": {
      maskType: 'alpha'
    }
  }, [(0, _vue$1.createVNode)("rect", {
    "x": "30",
    "y": "18",
    "width": "13",
    "height": "13",
    "fill": props.colors[2]
  }, null)]), (0, _vue$1.createVNode)("g", {
    "mask": 'url(#' + props.id + '603476ab' + ')'
  }, [(0, _vue$1.createVNode)("path", {
    "d": "M40.7348 20.2858L32.2495 28.7711",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue$1.createVNode)("path", {
    "d": "M32.2496 20.2858L40.7349 28.7711",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]), (0, _vue$1.createVNode)("path", {
    "d": "M24 6V42C17 42 11.7985 32.8391 11.7985 32.8391H6C4.89543 32.8391 4 31.9437 4 30.8391V17.0108C4 15.9062 4.89543 15.0108 6 15.0108H11.7985C11.7985 15.0108 17 6 24 6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

default_1$1 = VolumeMute$1.default = _default$1;

var VolumeNotice = {};

Object.defineProperty(VolumeNotice, "__esModule", {
  value: true
});
var default_1 = VolumeNotice.default = void 0;

var _vue = require$$0;

var _runtime = runtime;

var _default = (0, _runtime.IconWrapper)('volume-notice', true, function (props) {
  return (0, _vue.createVNode)("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [(0, _vue.createVNode)("path", {
    "d": "M24 6V42C17 42 11.7985 32.8391 11.7985 32.8391H6C4.89543 32.8391 4 31.9437 4 30.8391V17.0108C4 15.9062 4.89543 15.0108 6 15.0108H11.7985C11.7985 15.0108 17 6 24 6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue.createVNode)("path", {
    "d": "M32 15L32 15C32.6232 15.5565 33.1881 16.1797 33.6841 16.8588C35.1387 18.8504 36 21.3223 36 24C36 26.6545 35.1535 29.1067 33.7218 31.0893C33.2168 31.7885 32.6391 32.4293 32 33",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), (0, _vue.createVNode)("path", {
    "d": "M34.2359 41.1857C40.0836 37.6953 44 31.305 44 24C44 16.8085 40.2043 10.5035 34.507 6.97906",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap
  }, null)]);
});

default_1 = VolumeNotice.default = _default;

var DEFAULT_ICON_CONFIGS = {
  size: '1em',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  rtl: false,
  theme: 'outline',
  colors: {
    outline: {
      fill: '#333',
      background: 'transparent'
    },
    filled: {
      fill: '#333',
      background: '#FFF'
    },
    twoTone: {
      fill: '#333',
      twoTone: '#2F88FF'
    },
    multiColor: {
      outStrokeColor: '#333',
      outFillColor: '#2F88FF',
      innerStrokeColor: '#FFF',
      innerFillColor: '#43CCF8'
    }
  },
  prefix: 'i'
};

function guid() {
  return 'icon-' + ((1 + Math.random()) * 0x100000000 | 0).toString(16).substring(1);
}

function IconConverter(id, icon, config) {
  var fill = typeof icon.fill === 'string' ? [icon.fill] : icon.fill || [];
  var colors = [];
  var theme = icon.theme || config.theme;

  switch (theme) {
    case 'outline':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push('none');
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push('none');
      break;

    case 'filled':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push('#FFF');
      colors.push('#FFF');
      break;

    case 'two-tone':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[1] === 'string' ? fill[1] : config.colors.twoTone.twoTone);
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[1] === 'string' ? fill[1] : config.colors.twoTone.twoTone);
      break;

    case 'multi-color':
      colors.push(typeof fill[0] === 'string' ? fill[0] : 'currentColor');
      colors.push(typeof fill[1] === 'string' ? fill[1] : config.colors.multiColor.outFillColor);
      colors.push(typeof fill[2] === 'string' ? fill[2] : config.colors.multiColor.innerStrokeColor);
      colors.push(typeof fill[3] === 'string' ? fill[3] : config.colors.multiColor.innerFillColor);
      break;
  }

  return {
    size: icon.size || config.size,
    strokeWidth: icon.strokeWidth || config.strokeWidth,
    strokeLinecap: icon.strokeLinecap || config.strokeLinecap,
    strokeLinejoin: icon.strokeLinejoin || config.strokeLinejoin,
    colors: colors,
    id: id
  };
}
var IconContext = Symbol('icon-context');
function IconWrapper(name, rtl, render) {
  var options = {
    name: 'icon-' + name,
    props: ['size', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'theme', 'fill', 'spin'],
    setup: function setup(props) {
      var id = guid();
      var ICON_CONFIGS = inject(IconContext, DEFAULT_ICON_CONFIGS);
      return function () {
        var size = props.size,
            strokeWidth = props.strokeWidth,
            strokeLinecap = props.strokeLinecap,
            strokeLinejoin = props.strokeLinejoin,
            theme = props.theme,
            fill = props.fill,
            spin = props.spin;
        var svgProps = IconConverter(id, {
          size: size,
          strokeWidth: strokeWidth,
          strokeLinecap: strokeLinecap,
          strokeLinejoin: strokeLinejoin,
          theme: theme,
          fill: fill
        }, ICON_CONFIGS);
        var cls = [ICON_CONFIGS.prefix + '-icon'];
        cls.push(ICON_CONFIGS.prefix + '-icon' + '-' + name);

        if (ICON_CONFIGS.rtl) {
          cls.push(ICON_CONFIGS.prefix + '-icon-rtl');
        }

        if (spin) {
          cls.push(ICON_CONFIGS.prefix + '-icon-spin');
        }

        return createVNode("span", {
          "class": cls.join(' ')
        }, [render(svgProps)]);
      };
    }
  };
  return options;
}

const Video = IconWrapper('video', true, function (props) {
  return createVNode("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [createVNode("path", {
    "d": "M4 10C4 8.89543 4.89543 8 6 8H42C43.1046 8 44 8.89543 44 10V38C44 39.1046 43.1046 40 42 40H6C4.89543 40 4 39.1046 4 38V10Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M36 8V40",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M12 8V40",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M38 18H44",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M38 30H44",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M4 18H10",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M4 16V20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M9 8H15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M9 40H15",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M33 8H39",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M33 40H39",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M4 30H10",
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M4 28V32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M44 28V32",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M44 16V20",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M21 19L29 24L21 29V19Z",
    "fill": props.colors[3],
    "stroke": props.colors[2],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

const VolumeMute = IconWrapper('volume-mute', true, function (props) {
  return createVNode("svg", {
    "width": props.size,
    "height": props.size,
    "viewBox": "0 0 48 48",
    "fill": "none"
  }, [createVNode("rect", {
    "opacity": "0.01",
    "x": "30",
    "y": "18",
    "width": "13",
    "height": "13",
    "fill": props.colors[2]
  }, null), createVNode("mask", {
    "id": props.id + '603476ab',
    "maskUnits": "userSpaceOnUse",
    "x": "30",
    "y": "18",
    "width": "13",
    "height": "13",
    "style": {
      maskType: 'alpha'
    }
  }, [createVNode("rect", {
    "x": "30",
    "y": "18",
    "width": "13",
    "height": "13",
    "fill": props.colors[2]
  }, null)]), createVNode("g", {
    "mask": 'url(#' + props.id + '603476ab' + ')'
  }, [createVNode("path", {
    "d": "M40.7348 20.2858L32.2495 28.7711",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null), createVNode("path", {
    "d": "M32.2496 20.2858L40.7349 28.7711",
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linecap": props.strokeLinecap,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]), createVNode("path", {
    "d": "M24 6V42C17 42 11.7985 32.8391 11.7985 32.8391H6C4.89543 32.8391 4 31.9437 4 30.8391V17.0108C4 15.9062 4.89543 15.0108 6 15.0108H11.7985C11.7985 15.0108 17 6 24 6Z",
    "fill": props.colors[1],
    "stroke": props.colors[0],
    "stroke-width": props.strokeWidth,
    "stroke-linejoin": props.strokeLinejoin
  }, null)]);
});

export { default_1$R as $, default_1$q as A, default_1$r as B, default_1$s as C, default_1$t as D, default_1$u as E, default_1$v as F, default_1$w as G, default_1$x as H, default_1$y as I, default_1$z as J, default_1$A as K, default_1$B as L, default_1$C as M, default_1$D as N, default_1$E as O, default_1$F as P, default_1$G as Q, default_1$H as R, default_1$I as S, default_1$J as T, default_1$K as U, default_1$L as V, default_1$M as W, default_1$N as X, default_1$O as Y, default_1$P as Z, default_1$Q as _, default_1$1 as a, default_1$S as a0, default_1$T as a1, default_1$U as a2, default_1$V as a3, default_1$W as a4, default_1$X as a5, default_1$Y as a6, default_1$Z as a7, default_1$_ as a8, default_1$$ as a9, default_1$10 as aa, default_1$11 as ab, default_1$12 as ac, default_1$13 as ad, default_1$14 as ae, default_1$15 as af, default_1$16 as ag, default_1$17 as ah, default_1$18 as ai, default_1$19 as aj, default_1$1a as ak, default_1$1b as al, default_1$1c as am, default_1$1d as an, default_1$1e as ao, default_1$1f as ap, Video as aq, VolumeMute as ar, default_1$2 as b, default_1$3 as c, default_1 as d, default_1$4 as e, default_1$5 as f, default_1$6 as g, default_1$7 as h, default_1$8 as i, default_1$9 as j, default_1$a as k, default_1$b as l, default_1$c as m, default_1$d as n, default_1$e as o, default_1$f as p, default_1$g as q, default_1$h as r, default_1$i as s, default_1$j as t, default_1$k as u, default_1$l as v, default_1$m as w, default_1$n as x, default_1$o as y, default_1$p as z };
