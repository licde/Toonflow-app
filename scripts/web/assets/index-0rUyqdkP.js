const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DsLi01Ub.js","./markdown-CDQfeHxT.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js","./index-Dj17DntQ.js","./tdesign-CfL1pweZ.js","./i18n-C05S5xzz.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { i as instance } from './axios-DoLZCC01.js';
import { l as defineComponent, bM as storeToRefs, bL as useLocalStorage, r as ref, b2 as resolveComponent, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, a1 as unref, aL as createElementBlock, b0 as toDisplayString, j as createVNode, a$ as createTextVNode, F as Fragment, aT as createCommentVNode, av as isRef, w as watch, o as onMounted, b as onUnmounted, aP as renderList, aQ as normalizeStyle, bS as defineAsyncComponent, bT as useRoute, h, aU as normalizeClass, a_ as resolveDynamicComponent, bR as useRouter } from './vue-vendor-Byo5TD6r.js';
import { u as useI18n } from './i18n-C05S5xzz.js';
import { s as settingStore, l as languageList, c as cachedLocale, _ as _export_sfc, p as projectStore } from './index-Dj17DntQ.js';
import { B as Button, w as Dropdown, x as Steps, y as StepItem, I as Icon, A as Alert, Q as QRCode, E as Dialog, n as Tooltip, N as NotificationPlugin, F as Badge } from './tdesign-CfL1pweZ.js';

const _imports_0 = ""+new URL('logo-BvXHuXTY.png', import.meta.url).href+"";

function _classCallCheck(a, n) {
  if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}
function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), Object.defineProperty(e, "prototype", {
    writable: false
  }), e;
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (String )(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}

function normalizeComputedStyleValue(string) {
  // "250px" --> 250
  return +string.replace(/px/, '');
}
function fixDPR(canvas) {
  var dpr = window.devicePixelRatio;
  var computedStyles = getComputedStyle(canvas);
  var width = normalizeComputedStyleValue(computedStyles.getPropertyValue('width'));
  var height = normalizeComputedStyleValue(computedStyles.getPropertyValue('height'));
  canvas.setAttribute('width', (width * dpr).toString());
  canvas.setAttribute('height', (height * dpr).toString());
}

function generateRandomNumber(min, max) {
  var fractionDigits = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var randomNumber = Math.random() * (max - min) + min;
  return Math.floor(randomNumber * Math.pow(10, fractionDigits)) / Math.pow(10, fractionDigits);
}

function generateRandomArrayElement(arr) {
  return arr[generateRandomNumber(0, arr.length)];
}

var FREE_FALLING_OBJECT_ACCELERATION = 0.00125;
var MIN_DRAG_FORCE_COEFFICIENT = 0.0005;
var MAX_DRAG_FORCE_COEFFICIENT = 0.0009;
var ROTATION_SLOWDOWN_ACCELERATION = 0.00001;
var INITIAL_SHAPE_RADIUS = 6;
var INITIAL_EMOJI_SIZE = 80;
var MIN_INITIAL_CONFETTI_SPEED = 0.9;
var MAX_INITIAL_CONFETTI_SPEED = 1.7;
var MIN_FINAL_X_CONFETTI_SPEED = 0.2;
var MAX_FINAL_X_CONFETTI_SPEED = 0.6;
var MIN_INITIAL_ROTATION_SPEED = 0.03;
var MAX_INITIAL_ROTATION_SPEED = 0.07;
var MIN_CONFETTI_ANGLE_IN_DEGREES = 15;
var MAX_CONFETTI_ANGLE_IN_DEGREES = 82;
var MAX_CONFETTI_ANGLE_FIRED_FROM_SPEICIFIED_POSITION_IN_DEGREES = 150;
var SHAPE_VISIBILITY_TRESHOLD = 100;
var DEFAULT_CONFETTI_NUMBER = 250;
var DEFAULT_EMOJIS_NUMBER = 40;
var DEFAULT_CONFETTI_COLORS = ['#fcf403', '#62fc03', '#f4fc03', '#03e7fc', '#03fca5', '#a503fc', '#fc03ad', '#fc03c2'];

// For wide screens - fast confetti, for small screens - slow confetti
function getWindowWidthCoefficient(canvasWidth) {
  var HD_SCREEN_WIDTH = 1920;
  return Math.log(canvasWidth) / Math.log(HD_SCREEN_WIDTH);
}
var ConfettiShape = /*#__PURE__*/function () {
  function ConfettiShape(args) {
    _classCallCheck(this, ConfettiShape);
    var initialPosition = args.initialPosition,
      confettiRadius = args.confettiRadius,
      confettiColors = args.confettiColors,
      emojis = args.emojis,
      emojiSize = args.emojiSize,
      canvasWidth = args.canvasWidth,
      initialFlightAngle = args.initialFlightAngle,
      rotationAngle = args.rotationAngle,
      _args$shouldHideConfe = args.shouldHideConfettiInShiftedPosition,
      shouldHideConfettiInShiftedPosition = _args$shouldHideConfe === void 0 ? false : _args$shouldHideConfe;
    var randomConfettiSpeed = generateRandomNumber(MIN_INITIAL_CONFETTI_SPEED, MAX_INITIAL_CONFETTI_SPEED, 3);
    var initialSpeed = randomConfettiSpeed * getWindowWidthCoefficient(canvasWidth);
    this.confettiSpeed = {
      x: initialSpeed,
      y: initialSpeed
    };
    this.finalConfettiSpeedX = generateRandomNumber(MIN_FINAL_X_CONFETTI_SPEED, MAX_FINAL_X_CONFETTI_SPEED, 3);
    this.rotationSpeed = emojis.length ? 0.01 : generateRandomNumber(MIN_INITIAL_ROTATION_SPEED, MAX_INITIAL_ROTATION_SPEED, 3) * getWindowWidthCoefficient(canvasWidth);
    this.dragForceCoefficient = generateRandomNumber(MIN_DRAG_FORCE_COEFFICIENT, MAX_DRAG_FORCE_COEFFICIENT, 6);
    this.radius = {
      x: confettiRadius,
      y: confettiRadius
    };
    this.initialRadius = confettiRadius;
    this.rotationAngle = rotationAngle;
    this.emojiSize = emojiSize;
    this.emojiRotationAngle = generateRandomNumber(0, 2 * Math.PI);
    this.radiusYUpdateDirection = 'down';
    this.cos = Math.cos(initialFlightAngle);
    this.sin = Math.sin(initialFlightAngle);
    var positionShift = generateRandomNumber(-150, 0);
    this.positionOffset = {
      x: positionShift * this.sin,
      y: positionShift * this.cos
    };
    this.distanceTravelled = {
      x: 0,
      y: 0
    };
    var shiftedInitialPosition = {
      x: initialPosition.x + this.positionOffset.x,
      y: initialPosition.y - this.positionOffset.y
    };
    this.currentPosition = Object.assign({}, shiftedInitialPosition);
    this.initialPosition = Object.assign({}, shiftedInitialPosition);
    this.color = emojis.length ? null : generateRandomArrayElement(confettiColors);
    this.emoji = emojis.length ? generateRandomArrayElement(emojis) : null;
    this.createdAt = new Date().getTime();
    this.isVisible = !shouldHideConfettiInShiftedPosition;
  }
  return _createClass(ConfettiShape, [{
    key: "draw",
    value: function draw(canvasContext) {
      var currentPosition = this.currentPosition,
        radius = this.radius,
        color = this.color,
        emoji = this.emoji,
        rotationAngle = this.rotationAngle,
        emojiRotationAngle = this.emojiRotationAngle,
        emojiSize = this.emojiSize,
        isVisible = this.isVisible;
      if (!isVisible) return;
      var dpr = window.devicePixelRatio;
      if (color) {
        canvasContext.fillStyle = color;
        canvasContext.beginPath();
        canvasContext.ellipse(currentPosition.x * dpr, currentPosition.y * dpr, radius.x * dpr, radius.y * dpr, rotationAngle, 0, 2 * Math.PI);
        canvasContext.fill();
      } else if (emoji) {
        canvasContext.font = "".concat(emojiSize, "px serif");
        canvasContext.save();
        canvasContext.translate(dpr * currentPosition.x, dpr * currentPosition.y);
        canvasContext.rotate(emojiRotationAngle);
        canvasContext.textAlign = 'center';
        canvasContext.fillText(emoji, 0, 0);
        canvasContext.restore();
      }
    }
  }, {
    key: "updatePosition",
    value: function updatePosition(iterationTimeDelta, currentTime) {
      var confettiSpeed = this.confettiSpeed,
        dragForceCoefficient = this.dragForceCoefficient,
        finalConfettiSpeedX = this.finalConfettiSpeedX,
        radiusYUpdateDirection = this.radiusYUpdateDirection,
        rotationSpeed = this.rotationSpeed,
        createdAt = this.createdAt;
      if (confettiSpeed.x > finalConfettiSpeedX) this.confettiSpeed.x -= dragForceCoefficient * iterationTimeDelta;
      var prevPositionY = this.currentPosition.y;
      var timeDeltaSinceCreation = currentTime - createdAt;
      this.currentPosition.y = this.initialPosition.y - confettiSpeed.y * this.cos * timeDeltaSinceCreation + FREE_FALLING_OBJECT_ACCELERATION * Math.pow(timeDeltaSinceCreation, 2) / 2;
      var positionUpdate = {
        x: confettiSpeed.x * this.sin * iterationTimeDelta,
        y: this.currentPosition.y - prevPositionY
      };
      this.currentPosition.x += positionUpdate.x;
      this.distanceTravelled.x += Math.abs(positionUpdate.x);
      this.distanceTravelled.y += Math.abs(positionUpdate.y);
      if (this.distanceTravelled.x >= Math.abs(this.positionOffset.x) && this.distanceTravelled.y >= Math.abs(this.positionOffset.y)) {
        this.isVisible = true;
      }
      this.rotationSpeed -= this.emoji ? 0.0001 : ROTATION_SLOWDOWN_ACCELERATION * iterationTimeDelta;
      if (this.rotationSpeed < 0) this.rotationSpeed = 0;
      // no need to update rotation radius for emoji
      if (this.emoji) {
        this.emojiRotationAngle += this.rotationSpeed * iterationTimeDelta % (2 * Math.PI);
        return;
      }
      if (radiusYUpdateDirection === 'down') {
        this.radius.y -= iterationTimeDelta * rotationSpeed;
        if (this.radius.y <= 0) {
          this.radius.y = 0;
          this.radiusYUpdateDirection = 'up';
        }
      } else {
        this.radius.y += iterationTimeDelta * rotationSpeed;
        if (this.radius.y >= this.initialRadius) {
          this.radius.y = this.initialRadius;
          this.radiusYUpdateDirection = 'down';
        }
      }
    }
  }, {
    key: "getIsVisibleOnCanvas",
    value: function getIsVisibleOnCanvas(canvasHeight) {
      return this.currentPosition.y < canvasHeight + SHAPE_VISIBILITY_TRESHOLD;
    }
  }]);
}();

function createCanvas() {
  var canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '1000';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);
  return canvas;
}

function normalizeConfettiConfig(confettiConfig) {
  var _confettiConfig$confe = confettiConfig.confettiRadius,
    confettiRadius = _confettiConfig$confe === void 0 ? INITIAL_SHAPE_RADIUS : _confettiConfig$confe,
    _confettiConfig$confe2 = confettiConfig.confettiNumber,
    confettiNumber = _confettiConfig$confe2 === void 0 ? confettiConfig.confettiesNumber || (confettiConfig.emojis ? DEFAULT_EMOJIS_NUMBER : DEFAULT_CONFETTI_NUMBER) : _confettiConfig$confe2,
    _confettiConfig$confe3 = confettiConfig.confettiColors,
    confettiColors = _confettiConfig$confe3 === void 0 ? DEFAULT_CONFETTI_COLORS : _confettiConfig$confe3,
    _confettiConfig$emoji = confettiConfig.emojis,
    emojis = _confettiConfig$emoji === void 0 ? confettiConfig.emojies || [] : _confettiConfig$emoji,
    _confettiConfig$emoji2 = confettiConfig.emojiSize,
    emojiSize = _confettiConfig$emoji2 === void 0 ? INITIAL_EMOJI_SIZE : _confettiConfig$emoji2,
    _confettiConfig$confe4 = confettiConfig.confettiDispatchPosition,
    confettiDispatchPosition = _confettiConfig$confe4 === void 0 ? null : _confettiConfig$confe4;
  // deprecate wrong plural forms, used in early releases
  if (confettiConfig.emojies) console.error("emojies argument is deprecated, please use emojis instead");
  if (confettiConfig.confettiesNumber) console.error("confettiesNumber argument is deprecated, please use confettiNumber instead");
  return {
    confettiRadius: confettiRadius,
    confettiNumber: confettiNumber,
    confettiColors: confettiColors,
    emojis: emojis,
    emojiSize: emojiSize,
    confettiDispatchPosition: confettiDispatchPosition
  };
}

function convertDegreesToRadians(degreesToRadians) {
  return degreesToRadians * Math.PI / 180;
}
/*
 * determine the angle at which confetti is being dispatched
 *
 * for confetti that are dispatched from the sides of the screen, there's a min and max angle at which they could fly
 * for confetti that are dispatched from the specific position (like mouse click), the angle ranges from -max to max
 *
 * the angle is stored in radians, but degrees are used in constants for convenience
 *
 * examples:
 * - 0 means that confetti would fly straight up
 * - 0.7 means that confetti would start flying approximately 40 degrees to the right
 */
function generateConfettiInitialFlightAngleFiredFromLeftSideOfTheScreen() {
  return convertDegreesToRadians(generateRandomNumber(MAX_CONFETTI_ANGLE_IN_DEGREES, MIN_CONFETTI_ANGLE_IN_DEGREES));
}
function generateConfettiInitialFlightAngleFiredFromRightSideOfTheScreen() {
  return convertDegreesToRadians(generateRandomNumber(-MIN_CONFETTI_ANGLE_IN_DEGREES, -MAX_CONFETTI_ANGLE_IN_DEGREES));
}
function generateConfettiInitialFlightAngleFiredFromSpecificPosition() {
  return convertDegreesToRadians(generateRandomNumber(-MAX_CONFETTI_ANGLE_FIRED_FROM_SPEICIFIED_POSITION_IN_DEGREES, MAX_CONFETTI_ANGLE_FIRED_FROM_SPEICIFIED_POSITION_IN_DEGREES));
}
/*
 * WHAT IS THIS?
 */
function generateConfettiRotationAngleFiredFromLeftSideOfTheScreen() {
  return generateRandomNumber(0, 0.2, 3);
}
function generateConfettiRotationAngleFiredFromRightSideOfTheScreen() {
  return generateRandomNumber(-0.2, 0, 3);
}

var ConfettiBatch = /*#__PURE__*/function () {
  function ConfettiBatch(canvasContext) {
    var _this = this;
    _classCallCheck(this, ConfettiBatch);
    this.canvasContext = canvasContext;
    this.shapes = [];
    this.promise = new Promise(function (completionCallback) {
      return _this.resolvePromise = completionCallback;
    });
  }
  return _createClass(ConfettiBatch, [{
    key: "getBatchCompletePromise",
    value: function getBatchCompletePromise() {
      return this.promise;
    }
  }, {
    key: "addShapes",
    value: function addShapes() {
      var _this$shapes;
      (_this$shapes = this.shapes).push.apply(_this$shapes, arguments);
    }
  }, {
    key: "complete",
    value: function complete() {
      var _a;
      if (this.shapes.length) {
        return false;
      }
      (_a = this.resolvePromise) === null || _a === void 0 ? void 0 : _a.call(this);
      return true;
    }
  }, {
    key: "processShapes",
    value: function processShapes(time, canvasHeight, cleanupInvisibleShapes) {
      var _this2 = this;
      var timeDelta = time.timeDelta,
        currentTime = time.currentTime;
      this.shapes = this.shapes.filter(function (shape) {
        // Render the shapes in this batch
        shape.updatePosition(timeDelta, currentTime);
        shape.draw(_this2.canvasContext);
        // Only cleanup the shapes if we're being asked to
        if (!cleanupInvisibleShapes) {
          return true;
        }
        return shape.getIsVisibleOnCanvas(canvasHeight);
      });
    }
  }]);
}();
var JSConfetti = /*#__PURE__*/function () {
  function JSConfetti() {
    var jsConfettiConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, JSConfetti);
    this.activeConfettiBatches = [];
    this.canvas = jsConfettiConfig.canvas || createCanvas();
    this.canvasContext = this.canvas.getContext('2d');
    this.requestAnimationFrameRequested = false;
    this.lastUpdated = new Date().getTime();
    this.iterationIndex = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  return _createClass(JSConfetti, [{
    key: "loop",
    value: function loop() {
      this.requestAnimationFrameRequested = false;
      fixDPR(this.canvas);
      var currentTime = new Date().getTime();
      var timeDelta = currentTime - this.lastUpdated;
      var canvasHeight = this.canvas.offsetHeight;
      var cleanupInvisibleShapes = this.iterationIndex % 10 === 0;
      this.activeConfettiBatches = this.activeConfettiBatches.filter(function (batch) {
        batch.processShapes({
          timeDelta: timeDelta,
          currentTime: currentTime
        }, canvasHeight, cleanupInvisibleShapes);
        // Do not remove invisible shapes on every iteration
        if (!cleanupInvisibleShapes) {
          return true;
        }
        return !batch.complete();
      });
      this.iterationIndex++;
      this.queueAnimationFrameIfNeeded(currentTime);
    }
  }, {
    key: "queueAnimationFrameIfNeeded",
    value: function queueAnimationFrameIfNeeded(currentTime) {
      if (this.requestAnimationFrameRequested) {
        // We already have a pended animation frame, so there is no more work
        return;
      }
      if (this.activeConfettiBatches.length < 1) {
        // No shapes to animate, so don't queue another frame
        return;
      }
      this.requestAnimationFrameRequested = true;
      // Capture the last updated time for animation
      this.lastUpdated = currentTime || new Date().getTime();
      requestAnimationFrame(this.loop);
    }
  }, {
    key: "addConfettiAtPosition",
    value: function addConfettiAtPosition() {
      var confettiConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _normalizeConfettiCon = normalizeConfettiConfig(confettiConfig),
        confettiRadius = _normalizeConfettiCon.confettiRadius,
        confettiNumber = _normalizeConfettiCon.confettiNumber,
        confettiColors = _normalizeConfettiCon.confettiColors,
        emojis = _normalizeConfettiCon.emojis,
        emojiSize = _normalizeConfettiCon.emojiSize,
        confettiDispatchPosition = _normalizeConfettiCon.confettiDispatchPosition;
      var _this$canvas$getBound = this.canvas.getBoundingClientRect(),
        canvasWidth = _this$canvas$getBound.width;
      var confettiGroup = new ConfettiBatch(this.canvasContext);
      for (var i = 0; i < confettiNumber; i++) {
        var confettiShape = new ConfettiShape({
          initialPosition: confettiDispatchPosition,
          confettiRadius: confettiRadius,
          confettiColors: confettiColors,
          confettiNumber: confettiNumber,
          emojis: emojis,
          emojiSize: emojiSize,
          canvasWidth: canvasWidth,
          rotationAngle: generateConfettiRotationAngleFiredFromLeftSideOfTheScreen(),
          initialFlightAngle: generateConfettiInitialFlightAngleFiredFromSpecificPosition(),
          shouldHideConfettiInShiftedPosition: true
        });
        confettiGroup.addShapes(confettiShape);
      }
      this.activeConfettiBatches.push(confettiGroup);
      this.queueAnimationFrameIfNeeded();
      return confettiGroup.getBatchCompletePromise();
    }
  }, {
    key: "addConfetti",
    value: function addConfetti() {
      var confettiConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _normalizeConfettiCon2 = normalizeConfettiConfig(confettiConfig),
        confettiRadius = _normalizeConfettiCon2.confettiRadius,
        confettiNumber = _normalizeConfettiCon2.confettiNumber,
        confettiColors = _normalizeConfettiCon2.confettiColors,
        emojis = _normalizeConfettiCon2.emojis,
        emojiSize = _normalizeConfettiCon2.emojiSize;
      // Use the bounding rect rather tahn the canvas width / height, because
      // .width / .height are unset until a layout pass has been completed. Upon
      // confetti being immediately queued on a page load, this hasn't happened so
      // the default of 300x150 will be returned, causing an improper source point
      // for the confetti animation.
      var _this$canvas$getBound2 = this.canvas.getBoundingClientRect(),
        canvasWidth = _this$canvas$getBound2.width,
        canvasHeight = _this$canvas$getBound2.height;
      var yPosition = canvasHeight * 5 / 7;
      var leftConfettiPosition = {
        x: 0,
        y: yPosition
      };
      var rightConfettiPosition = {
        x: canvasWidth,
        y: yPosition
      };
      var confettiGroup = new ConfettiBatch(this.canvasContext);
      for (var i = 0; i < confettiNumber / 2; i++) {
        var confettiOnTheLeft = new ConfettiShape({
          initialPosition: leftConfettiPosition,
          confettiRadius: confettiRadius,
          confettiColors: confettiColors,
          confettiNumber: confettiNumber,
          emojis: emojis,
          emojiSize: emojiSize,
          canvasWidth: canvasWidth,
          rotationAngle: generateConfettiRotationAngleFiredFromLeftSideOfTheScreen(),
          initialFlightAngle: generateConfettiInitialFlightAngleFiredFromLeftSideOfTheScreen()
        });
        var confettiOnTheRight = new ConfettiShape({
          initialPosition: rightConfettiPosition,
          confettiRadius: confettiRadius,
          confettiColors: confettiColors,
          confettiNumber: confettiNumber,
          emojis: emojis,
          emojiSize: emojiSize,
          canvasWidth: canvasWidth,
          rotationAngle: generateConfettiRotationAngleFiredFromRightSideOfTheScreen(),
          initialFlightAngle: generateConfettiInitialFlightAngleFiredFromRightSideOfTheScreen()
        });
        confettiGroup.addShapes(confettiOnTheRight, confettiOnTheLeft);
      }
      this.activeConfettiBatches.push(confettiGroup);
      this.queueAnimationFrameIfNeeded();
      return confettiGroup.getBatchCompletePromise();
    }
  }, {
    key: "clearCanvas",
    value: function clearCanvas() {
      this.activeConfettiBatches = [];
    }
  }, {
    key: "destroyCanvas",
    value: function destroyCanvas() {
      this.canvas.remove();
    }
  }]);
}();

const _hoisted_1$1 = { class: "helloGuide" };
const _hoisted_2$1 = {
  key: 0,
  class: "welcomePage"
};
const _hoisted_3$1 = { class: "welcomeTitle" };
const _hoisted_4$1 = { class: "welcomeDesc" };
const _hoisted_5$1 = { class: "langBtn" };
const _hoisted_6$1 = { class: "stepContent" };
const _hoisted_7$1 = {
  key: 0,
  class: "stepItem"
};
const _hoisted_8$1 = { class: "stepIcon" };
const _hoisted_9$1 = { class: "stepTitle" };
const _hoisted_10$1 = { class: "stepDesc" };
const _hoisted_11$1 = { class: "stepTip" };
const _hoisted_12$1 = {
  key: 1,
  class: "stepItem"
};
const _hoisted_13 = { class: "stepIcon" };
const _hoisted_14 = { class: "stepTitle" };
const _hoisted_15 = { class: "stepDesc" };
const _hoisted_16 = { class: "stepTip" };
const _hoisted_17 = {
  key: 2,
  class: "stepItem"
};
const _hoisted_18 = { class: "stepIcon" };
const _hoisted_19 = { class: "stepTitle" };
const _hoisted_20 = { class: "stepDesc" };
const _hoisted_21 = { class: "qrcodeBox" };
const _hoisted_22 = { class: "qrcodeLabel" };
const _hoisted_23 = { class: "githubBox" };
const _hoisted_24 = { class: "qrcodeLabel" };
const _hoisted_25 = { class: "guideFooter" };
const _hoisted_26 = { class: "footerRight" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "hello",
  setup(__props) {
    const { showSetting, activeMenu, isElectron } = storeToRefs(settingStore());
    const { locale } = useI18n();
    const langOptions = languageList.map((item) => ({
      content: item.label,
      value: item.value
    }));
    const handleChangeLang = (data) => {
      locale.value = data.value;
      cachedLocale.value = data.value;
    };
    const guideDone = useLocalStorage("helloGuideDone", false);
    const show = ref(!guideDone.value);
    const currentStep = ref(0);
    function openVendorConfig() {
      activeMenu.value = "vendorConfig";
      showSetting.value = true;
    }
    function openAgentConfig() {
      activeMenu.value = "agentConfog";
      showSetting.value = true;
    }
    function handleSkip() {
      guideDone.value = true;
      show.value = false;
    }
    function handleFinish() {
      guideDone.value = true;
      show.value = false;
      const jsConfetti = new JSConfetti();
      jsConfetti.addConfetti();
    }
    async function jumpGithub() {
      if (isElectron.value) {
        await fetch("toonflow://openurlwithbrowser?url=https://github.com/HBAI-Ltd/Toonflow-app");
      } else {
        window.open("https://github.com/HBAI-Ltd/Toonflow-app");
      }
    }
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_i_translate = resolveComponent("i-translate");
      const _component_t_dropdown = Dropdown;
      const _component_t_step_item = StepItem;
      const _component_t_steps = Steps;
      const _component_t_icon = Icon;
      const _component_t_alert = Alert;
      const _component_t_qrcode = QRCode;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: unref(show),
        "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => isRef(show) ? show.value = $event : null),
        footer: false,
        header: false,
        width: "680px",
        "close-on-overlay-click": false,
        placement: "center"
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            unref(currentStep) === 0 ? (openBlock(), createElementBlock("div", _hoisted_2$1, [
              _cache[4] || (_cache[4] = createBaseVNode("img", {
                src: _imports_0,
                alt: "ToonFlow Logo",
                class: "welcomeLogo"
              }, null, -1)),
              createBaseVNode("h1", _hoisted_3$1, toDisplayString(_ctx.$t("hello.welcomeTitle")), 1),
              createBaseVNode("p", _hoisted_4$1, toDisplayString(_ctx.$t("hello.welcomeDesc")), 1),
              createVNode(_component_t_button, {
                theme: "primary",
                size: "large",
                onClick: _cache[0] || (_cache[0] = ($event) => currentStep.value = 1)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("hello.startConfig")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                variant: "text",
                size: "small",
                style: { "margin-top": "12px" },
                onClick: handleSkip
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("hello.skip")), 1)
                ]),
                _: 1
              }),
              createBaseVNode("div", _hoisted_5$1, [
                createVNode(_component_t_dropdown, {
                  options: unref(langOptions),
                  trigger: "click",
                  onClick: handleChangeLang,
                  maxColumnWidth: 150
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_button, {
                      shape: "circle",
                      theme: "default",
                      size: "large"
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_translate, {
                          theme: "outline",
                          size: "20"
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["options"])
              ])
            ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createVNode(_component_t_steps, {
                current: unref(currentStep) - 1,
                class: "guideSteps"
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_step_item, {
                    title: _ctx.$t("hello.configModel")
                  }, null, 8, ["title"]),
                  createVNode(_component_t_step_item, {
                    title: _ctx.$t("hello.configData")
                  }, null, 8, ["title"]),
                  createVNode(_component_t_step_item, {
                    title: _ctx.$t("hello.startUse")
                  }, null, 8, ["title"])
                ]),
                _: 1
              }, 8, ["current"]),
              createBaseVNode("div", _hoisted_6$1, [
                unref(currentStep) === 1 ? (openBlock(), createElementBlock("div", _hoisted_7$1, [
                  createBaseVNode("div", _hoisted_8$1, [
                    createVNode(_component_t_icon, {
                      name: "server",
                      size: "48px"
                    })
                  ]),
                  createBaseVNode("h2", _hoisted_9$1, toDisplayString(_ctx.$t("hello.configModelTitle")), 1),
                  createBaseVNode("p", _hoisted_10$1, toDisplayString(_ctx.$t("hello.configModelDesc")), 1),
                  createBaseVNode("div", _hoisted_11$1, [
                    createVNode(_component_t_alert, {
                      theme: "info",
                      message: _ctx.$t("hello.configModelTip")
                    }, null, 8, ["message"])
                  ]),
                  createVNode(_component_t_button, {
                    theme: "primary",
                    size: "large",
                    onClick: openVendorConfig
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_t_icon, { name: "setting" })
                    ]),
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(_ctx.$t("hello.configModelBtn")), 1)
                    ]),
                    _: 1
                  })
                ])) : createCommentVNode("", true),
                unref(currentStep) === 2 ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
                  createBaseVNode("div", _hoisted_13, [
                    createVNode(_component_t_icon, {
                      name: "relativity",
                      size: "48px"
                    })
                  ]),
                  createBaseVNode("h2", _hoisted_14, toDisplayString(_ctx.$t("hello.configAgentTitle")), 1),
                  createBaseVNode("p", _hoisted_15, toDisplayString(_ctx.$t("hello.configAgentDesc")), 1),
                  createBaseVNode("div", _hoisted_16, [
                    createVNode(_component_t_alert, {
                      theme: "info",
                      message: _ctx.$t("hello.configAgentTip")
                    }, null, 8, ["message"])
                  ]),
                  createVNode(_component_t_button, {
                    theme: "primary",
                    size: "large",
                    onClick: openAgentConfig
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_t_icon, { name: "setting" })
                    ]),
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(_ctx.$t("hello.configAgentBtn")), 1)
                    ]),
                    _: 1
                  })
                ])) : createCommentVNode("", true),
                unref(currentStep) === 3 ? (openBlock(), createElementBlock("div", _hoisted_17, [
                  createBaseVNode("div", _hoisted_18, [
                    createVNode(_component_t_icon, {
                      name: "check-circle",
                      size: "48px",
                      color: "var(--td-success-color)"
                    })
                  ]),
                  createBaseVNode("h2", _hoisted_19, toDisplayString(_ctx.$t("hello.finishTitle")), 1),
                  createBaseVNode("p", _hoisted_20, toDisplayString(_ctx.$t("hello.finishDesc")), 1),
                  createBaseVNode("div", _hoisted_21, [
                    createBaseVNode("p", _hoisted_22, toDisplayString(_ctx.$t("hello.qrcodeLabel")), 1),
                    createVNode(_component_t_qrcode, {
                      value: "https://work.weixin.qq.com/u/vc36adcc89845edcbe?v=5.0.3.63936&bb=85b8d228e8",
                      level: "Q",
                      type: "svg"
                    })
                  ]),
                  createBaseVNode("div", _hoisted_23, [
                    createBaseVNode("p", _hoisted_24, toDisplayString(_ctx.$t("hello.githubLabel")), 1),
                    createVNode(_component_t_button, {
                      theme: "danger",
                      size: "large",
                      onClick: jumpGithub
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_t_icon, { name: "logo-github" })
                      ]),
                      default: withCtx(() => [
                        _cache[5] || (_cache[5] = createTextVNode(" Star on GitHub ", -1))
                      ]),
                      _: 1
                    })
                  ])
                ])) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", _hoisted_25, [
                unref(currentStep) > 1 ? (openBlock(), createBlock(_component_t_button, {
                  key: 0,
                  variant: "outline",
                  onClick: _cache[1] || (_cache[1] = ($event) => currentStep.value--)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("hello.prevStep")), 1)
                  ]),
                  _: 1
                })) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_26, [
                  unref(currentStep) < 3 ? (openBlock(), createBlock(_component_t_button, {
                    key: 0,
                    variant: "text",
                    onClick: handleSkip
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("hello.skip")), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true),
                  unref(currentStep) < 3 ? (openBlock(), createBlock(_component_t_button, {
                    key: 1,
                    theme: "primary",
                    onClick: _cache[2] || (_cache[2] = ($event) => currentStep.value++)
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("hello.nextStep")), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true),
                  unref(currentStep) === 3 ? (openBlock(), createBlock(_component_t_button, {
                    key: 2,
                    theme: "primary",
                    onClick: handleFinish
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("hello.finish")), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ])
              ])
            ], 64))
          ])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});

/* unplugin-vue-components disabled */

const hello = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-da3a500c"]]);

const _hoisted_1 = { class: "menu fc jb" };
const _hoisted_2 = { class: "itemBox fc ac" };
const _hoisted_3 = ["onClick"];
const _hoisted_4 = {
  key: 1,
  class: "divider"
};
const _hoisted_5 = { class: "footItem fc ac" };
const _hoisted_6 = { class: "view" };
const _hoisted_7 = {
  key: 0,
  class: "topMenu f ac jb"
};
const _hoisted_8 = { class: "title" };
const _hoisted_9 = { class: "rightBtnList f ac" };
const _hoisted_10 = ["onClick"];
const _hoisted_11 = {
  key: 1,
  class: "divider"
};
const _hoisted_12 = { class: "viewBox" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const setting = defineAsyncComponent(() => __vitePreload(() => import('./index-DsLi01Ub.js'),true?__vite__mapDeps([0,1,2,3,4,5,6]):void 0,import.meta.url));
    const { project } = storeToRefs(projectStore());
    const { showSetting, isElectron, needUpdate } = storeToRefs(settingStore());
    const menuList = ref([
      { type: "btn", path: "/project", labelKey: "workbench.menu.myProject", icon: "i-folder-close" },
      { type: "btn", path: "/task", labelKey: "workbench.menu.taskCenter", icon: "i-view-list" }
      // { type: "divider" },
    ]);
    const rightBtnList = ref([
      { type: "btn", path: "/novel", labelKey: "workbench.menu.novel", icon: "i-notebook", nodelOnly: true, needProject: true },
      { type: "btn", path: "/scriptAgent", labelKey: "workbench.menu.scriptAgent", icon: "i-color-filter", nodelOnly: true, needProject: true },
      { type: "btn", path: "/script", labelKey: "workbench.menu.scriptManage", icon: "i-document-folder", needProject: true },
      { type: "btn", path: "/cornerScape", labelKey: "workbench.menu.cornerScape", icon: "i-peoples-two", needProject: true },
      { type: "btn", path: "/production", labelKey: "workbench.menu.production", icon: "i-carousel-video", needProject: true },
      { type: "divider" },
      { type: "btn", path: "/assets", labelKey: "workbench.menu.assetCenter", icon: "i-receive", needProject: true }
    ]);
    const router = useRouter();
    const route = useRoute();
    const activeMenu = ref(route.path);
    watch(
      () => route.path,
      (newPath) => {
        activeMenu.value = newPath;
      }
    );
    function handleClick(menu) {
      if (menu.needProject && !project.value?.id) {
        window.$message?.warning?.($t("workbench.selectProject"));
        router.push("/project");
        return;
      }
      router.push(menu.path);
      activeMenu.value = menu.path;
    }
    async function jumpGithub() {
      if (isElectron.value) {
        await fetch("toonflow://openurlwithbrowser?url=https://github.com/HBAI-Ltd/Toonflow-app");
      } else {
        window.open("https://github.com/HBAI-Ltd/Toonflow-app");
      }
    }
    async function openFeedback() {
      if (isElectron.value) {
        await fetch("toonflow://openurlwithbrowser?url=https://docs.qq.com/smartsheet/form/EmvmQBrmlPmr%2Fss_vsqk2v%2FvhiGzE?tab=ss_vsqk2v");
      } else {
        window.open("https://docs.qq.com/smartsheet/form/EmvmQBrmlPmr%2Fss_vsqk2v%2FvhiGzE?tab=ss_vsqk2v");
      }
    }
    async function checkVersion() {
      const { data } = await instance.post("/setting/about/checkUpdate", {
        source: "toonflow"
      });
      if (data.needUpdate) {
        needUpdate.value = true;
        const { activeMenu: settingActiveMenu } = storeToRefs(settingStore());
        const notifyInstance = NotificationPlugin.success({
          title: $t("version.newVersion"),
          content: () => h(
            "div",
            { style: "text-align: right; padding-top: 4px;" },
            h(
              "span",
              {
                style: "color: #ed7b2f; font-size: 12px; cursor: pointer;",
                onClick: () => {
                  settingActiveMenu.value = "about";
                  showSetting.value = true;
                  NotificationPlugin.close(notifyInstance);
                }
              },
              $t("skillScan.openSettings")
            )
          ),
          closeBtn: true,
          placement: "bottom-right"
        });
      } else {
        needUpdate.value = false;
      }
    }
    let checkVersionTimer = null;
    function startVersionCheck() {
      checkVersion();
      checkVersionTimer = setInterval(
        () => {
          checkVersion();
        },
        2 * 60 * 1e3
      );
    }
    function stopVersionCheck() {
      if (checkVersionTimer) {
        clearInterval(checkVersionTimer);
        checkVersionTimer = null;
      }
    }
    watch(needUpdate, (val) => {
      if (val) stopVersionCheck();
    });
    onMounted(() => {
      startVersionCheck();
    });
    onUnmounted(() => {
      stopVersionCheck();
    });
    return (_ctx, _cache) => {
      const _component_t_tooltip = Tooltip;
      const _component_i_bill = resolveComponent("i-bill");
      const _component_i_setting_one = resolveComponent("i-setting-one");
      const _component_t_badge = Badge;
      const _component_i_github_one = resolveComponent("i-github-one");
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("div", {
          class: "main",
          style: normalizeStyle({ height: unref(isElectron) ? "calc(100vh - 32px)" : "100vh" })
        }, [
          createBaseVNode("div", _hoisted_1, [
            _cache[1] || (_cache[1] = createBaseVNode("div", { class: "logoBox c" }, [
              createBaseVNode("div", { class: "logo" })
            ], -1)),
            createBaseVNode("div", _hoisted_2, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(menuList), (menu, index) => {
                return openBlock(), createBlock(_component_t_tooltip, {
                  content: menu.labelKey ? _ctx.$t(menu.labelKey) : "",
                  placement: "right",
                  destroyOnClose: "",
                  showArrow: false,
                  key: index
                }, {
                  default: withCtx(() => [
                    menu.type === "btn" ? (openBlock(), createElementBlock("div", {
                      key: 0,
                      class: normalizeClass(["item fc c", { active: unref(activeMenu) == menu.path }]),
                      onClick: ($event) => handleClick(menu)
                    }, [
                      (openBlock(), createBlock(resolveDynamicComponent(menu.icon), { class: "icon" }))
                    ], 10, _hoisted_3)) : createCommentVNode("", true),
                    menu.type === "divider" ? (openBlock(), createElementBlock("div", _hoisted_4)) : createCommentVNode("", true)
                  ]),
                  _: 2
                }, 1032, ["content"]);
              }), 128))
            ]),
            createBaseVNode("div", _hoisted_5, [
              createVNode(_component_t_tooltip, {
                content: _ctx.$t("workbench.menu.feedbackQuestions"),
                placement: "right",
                destroyOnClose: "",
                showArrow: false
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", {
                    class: "item c",
                    onClick: openFeedback
                  }, [
                    createVNode(_component_i_bill, { class: "icon" })
                  ])
                ]),
                _: 1
              }, 8, ["content"]),
              createVNode(_component_t_tooltip, {
                content: _ctx.$t("workbench.menu.settings"),
                placement: "right",
                destroyOnClose: "",
                showArrow: false
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", {
                    class: "item c",
                    onClick: _cache[0] || (_cache[0] = ($event) => showSetting.value = true)
                  }, [
                    createVNode(_component_t_badge, {
                      count: unref(needUpdate) ? 1 : 0,
                      dot: ""
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_i_setting_one, { class: "icon" })
                      ]),
                      _: 1
                    }, 8, ["count"])
                  ])
                ]),
                _: 1
              }, 8, ["content"]),
              createVNode(_component_t_tooltip, {
                content: _ctx.$t("workbench.menu.jumpGithub"),
                placement: "right",
                destroyOnClose: "",
                showArrow: false
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", {
                    class: "item c",
                    onClick: jumpGithub
                  }, [
                    createVNode(_component_i_github_one, { class: "icon" })
                  ])
                ]),
                _: 1
              }, 8, ["content"])
            ])
          ]),
          createBaseVNode("div", _hoisted_6, [
            unref(project)?.id ? (openBlock(), createElementBlock("div", _hoisted_7, [
              createBaseVNode("div", _hoisted_8, [
                createBaseVNode("h2", null, toDisplayString(unref(project)?.name || _ctx.$t("workbench.selectProject")), 1)
              ]),
              createBaseVNode("div", _hoisted_9, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(rightBtnList), (menu, index) => {
                  return openBlock(), createBlock(_component_t_tooltip, {
                    content: menu.labelKey ? _ctx.$t(menu.labelKey) : "",
                    placement: "bottom",
                    destroyOnClose: "",
                    showArrow: false,
                    key: index
                  }, {
                    default: withCtx(() => [
                      menu.type === "btn" && (unref(project).projectType === "novel" || !menu.nodelOnly) ? (openBlock(), createElementBlock("div", {
                        key: 0,
                        class: normalizeClass(["item fc c", { active: unref(activeMenu) == menu.path }]),
                        onClick: ($event) => handleClick(menu)
                      }, [
                        (openBlock(), createBlock(resolveDynamicComponent(menu.icon), { class: "icon" }))
                      ], 10, _hoisted_10)) : createCommentVNode("", true),
                      menu.type === "divider" ? (openBlock(), createElementBlock("div", _hoisted_11)) : createCommentVNode("", true)
                    ]),
                    _: 2
                  }, 1032, ["content"]);
                }), 128))
              ])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_12, [
              createVNode(_component_router_view, null, {
                default: withCtx(({ Component }) => [
                  (openBlock(), createBlock(resolveDynamicComponent(Component), {
                    key: _ctx.$route.fullPath
                  }))
                ]),
                _: 1
              })
            ])
          ])
        ], 4),
        createVNode(hello),
        unref(showSetting) ? (openBlock(), createBlock(unref(setting), { key: 0 })) : createCommentVNode("", true)
      ], 64);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-522df9e1"]]);

const index$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: index
}, Symbol.toStringTag, { value: 'Module' }));

export { _imports_0 as _, index$1 as i };
