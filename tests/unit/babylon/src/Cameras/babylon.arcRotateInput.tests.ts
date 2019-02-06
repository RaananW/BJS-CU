/**
 * Many PointerEvent properties are read-only so using real "new PointerEvent()"
 * is unpractical.
 */
interface MockPointerEvent {
  target?: HTMLElement;
  type?: string;
  button?: number;
  pointerId?: number;
  pointerType?: string;
  clientX?: number;
  clientY?: number;
  movementX?: number;
  movementY?: number;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  buttons?: number[];
  [propName: string]: any;
}

enum ValChange {
  Increase,
  Same,
  Decrease,
  DontCare,
}

/**
 * Test the things.
 */
describe('arcRotateCameraInput', function() {
  /**
   * Sets the timeout of all the tests to 10 seconds.
   */
  this.timeout(10000);

  const interestingValues = [
    "inertialPanningX",
    "inertialPanningY",
    "inertialAlphaOffset",
    "inertialBetaOffset",
    "inertialRadiusOffset",
  ];

  function resetCameraPos(camera: BABYLON.ArcRotateCamera, cameraCachePos: {}) {
    camera.alpha = 10;
    camera.beta = 20;
    camera.radius = 30;
    camera.inertialPanningX = 0;
    camera.inertialPanningY = 0;
    camera.inertialAlphaOffset = 0;
    camera.inertialBetaOffset = 0;
    camera.inertialRadiusOffset = 0;
    camera._panningMouseButton = 2;
    camera.useInputToRestoreState = true;
    camera._useCtrlForPanning = true;
    
    interestingValues.forEach((key) => {
      cameraCachePos[key] = camera[key];
    });
  }

  function verifyChanges(
    camera: BABYLON.ArcRotateCamera,
    cameraCachePos: {},
    toCheck: {[key: string]: ValChange}): boolean {
      let result = true;
      interestingValues.forEach((key) => {
        result = result && (
          (toCheck[key] === ValChange.Decrease && camera[key] < cameraCachePos[key]) ||
          (toCheck[key] === ValChange.Same && camera[key] === cameraCachePos[key]) ||
          (toCheck[key] === ValChange.Increase && camera[key] > cameraCachePos[key]) ||
          toCheck[key] === undefined || toCheck[key] === ValChange.DontCare);
      });

    return result;
  }

  function displayCamera(camera: BABYLON.ArcRotateCamera): void {
    let info = {
      inertialPanningX: camera.inertialPanningX,
      inertialPanningY: camera.inertialPanningY,
      inertialAlphaOffset: camera.inertialAlphaOffset,
      inertialBetaOffset: camera.inertialBetaOffset,
      inertialRadiusOffset: camera.inertialRadiusOffset
    };
    console.log(info);
  };

  /**
   * Make a mock Event.
   * Many PointerEvent properties are read-only so using real "new PointerEvent()"
   * is unpractical.
   */
  function eventTemplate(target: HTMLElement): MockPointerEvent {
    let returnVal = {
      target,
      button: 0,
      preventDefault: () => {},
    };
    return returnVal;
  }

  /**
   * Simulate PointerEvent in ArcRotateCameraPointersInput instance.
   */
  function simulateEvent(cameraInput: BABYLON.ArcRotateCameraPointersInput,
                         event: MockPointerEvent) {
    console.log(event);
    let pointerInfo = {};
    switch (event.type) {
      case "pointerdown":
        pointerInfo = {type: BABYLON.PointerEventTypes.POINTERDOWN, event};
        // Cast "camera" to <any> to relax "private" classification.
        (<any>cameraInput)._pointerInput(pointerInfo, undefined);
        break;
      case "pointerup":
        pointerInfo = {type: BABYLON.PointerEventTypes.POINTERUP, event};
        // Cast "camera" to <any> to relax "private" classification.
        (<any>cameraInput)._pointerInput(pointerInfo, undefined);
        break;
      case "pointermove":
        pointerInfo = {type: BABYLON.PointerEventTypes.POINTERMOVE, event};
        // Cast "camera" to <any> to relax "private" classification.
        (<any>cameraInput)._pointerInput(pointerInfo, undefined);
        break;
      case "blur":
        // Cast "camera" to <any> to relax "private" classification.
        (<any>cameraInput)._onLostFocus();
        break;
      case "POINTERDOUBLETAP":
        // Not a real DOM event. Just a shortcut to trigger
        // PointerEventTypes.POINTERMOVE on the Input class.
        pointerInfo = {type: BABYLON.PointerEventTypes.POINTERDOUBLETAP, event};
        // Cast "camera" to <any> to relax "private" classification.
        (<any>cameraInput)._pointerInput(pointerInfo, undefined);
        break;
      default:
        console.error("Invalid pointer event: " + event.type);
    }
  }

  before(function(done) {
    // runs before all tests in this block
    this.timeout(180000);
    (BABYLONDEVTOOLS).Loader
      .useDist()
      .testMode()
      .load(function() {
        // Force apply promise polyfill for consistent behavior between
        // PhantomJS, IE11, and other browsers.
        BABYLON.PromisePolyfill.Apply(true);
        done();
      });

    this._canvas = document.createElement("canvas");
    this._scene = new BABYLON.Scene(new BABYLON.NullEngine());
    
    // Set up an instance of a Camera with the ArcRotateCameraPointersInput.
    this.camera = new BABYLON.ArcRotateCamera(
      "MockCameraOriginal", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), this._scene);
    this.cameraInput = new BABYLON.ArcRotateCameraPointersInput();
    this.cameraInput.camera = this.camera;
    this.cameraInput.attachControl(this._canvas);

    this.cameraCachePos = {};
  });

  beforeEach(function() {
    // runs before each test in this block
    resetCameraPos(this.camera, this.cameraCachePos);
  });

  describe('Test infrastructure', function() {
    it('verifyChanges checks Decrease', function() {
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 10.001;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.Decrease})
      ).to.be.true;
      
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 9.999;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.Decrease})
      ).to.be.false;
    });
  
    it('verifyChanges checks Same', function() {
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 10;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.Same})
      ).to.be.true;
      
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 10.001;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.Same})
      ).to.be.false;
    });
  
    it('verifyChanges checks DontCare', function() {
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 10;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.DontCare})
      ).to.be.true;
      
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 10.001;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {/*inertialAlphaOffset: undefined*/})
      ).to.be.true;
    });
  
    it('verifyChanges checks Increase', function() {
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 9.999;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.Increase})
      ).to.be.true;
      
      this.camera.inertialAlphaOffset = 10;
      this.cameraCachePos.inertialAlphaOffset = 10.001;
      expect(
        verifyChanges(
          this.camera,
          this.cameraCachePos,
          {inertialAlphaOffset: ValChange.Increase})
      ).to.be.false;
    });
  });
  
  
  describe('one button drag', function() {
    it('should change inertialAlphaOffset', function() {
      var event: MockPointerEvent = eventTemplate(<HTMLElement>this._canvas);

      // Button down.
      event.type = "pointerdown";
      event.clientX = 100;
      event.clientY = 200;
      event.button = 0;
      simulateEvent(this.cameraInput, event);
      expect(verifyChanges(this.camera, this.cameraCachePos, {})).to.be.true;
      
      // Start moving.
      event.type = "pointermove";
      event.button = 0;
      simulateEvent(this.cameraInput, event);
      expect(verifyChanges(this.camera, this.cameraCachePos, {})).to.be.true;

      // Move X coordinate. Drag camera.
      event.type = "pointermove";
      event.clientX = 1000;
      event.button = 0;
      simulateEvent(this.cameraInput, event);
      expect(verifyChanges(
        this.camera,
        this.cameraCachePos,
        {inertialAlphaOffset: ValChange.Decrease})).to.be.true;
      
      expect(true).to.equal(true);
      expect(true).to.be.true;
    });
  });
});
