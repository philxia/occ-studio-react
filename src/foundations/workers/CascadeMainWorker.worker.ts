import initOpenCascade, { OpenCascadeInstance, TopoDS_Shape }  from "opencascade.js";
import registerPromiseWorker from "promise-worker/register";
import { Vector3 } from "three";
import { Difference, Extrude, ForEachEdge, ForEachFace, MakeFaceWithArcInformation, MakeFaceWithLoops, Polygon, Rotate, ShapeToMesh, Translate, Union } from "./CascadeStudioStandardLibrary";

let oc: OpenCascadeInstance;
const messageHandlers: any = {};
const sceneShapes: any = [];

export const NewSphere = (radius: number) => {
  // Construct a Sphere Primitive
  let spherePlane = new oc.gp_Ax2_3(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_3(new oc.gp_XYZ_2(0, 0, 1)));
  let sphere = new oc.BRepPrimAPI_MakeSphere_9(spherePlane, radius);
  const sphereShape = sphere.Shape();
  sceneShapes.push(sphereShape);
  return sphereShape;
}



initOpenCascade({
  mainWasm: 'opencascade.full.wasm'
}).then((openCascade: OpenCascadeInstance) => {
  // Register the "OpenCascade" WebAssembly Module under the shorthand "oc"
  oc = openCascade;

  // Ping Pong Messages Back and Forth based on their registration in messageHandlers
  onmessage = function (e) {
    if (!e.data.type) return;
    let response = messageHandlers[e.data.type](e.data.payload);
    if (response) {
      postMessage({ type: e.data.type, payload: response });
    }
  };

  // Initial Evaluation after everything has been loaded...
  postMessage({ type: "startupCallback" });
});

registerPromiseWorker(function (payload: any) {
  let opNumber = 0; // This keeps track of the progress of the evaluation
  const GUIState = payload.GUIState;
  let currentShape;
  let sceneBuilder;
  try {
    if (payload.action === "createFloorBrep") {
      const {
        profile, //Array<Array<LineData|ArcData>>,
        elevation,
        thickness,
      } = payload.data;
      const floorProfile = MakeFaceWithLoops(oc, profile, elevation);
      const shape: TopoDS_Shape = Extrude(oc, floorProfile, [0, 0, thickness]);

      if (shape.ShapeType() !== oc.TopAbs_ShapeEnum.TopAbs_SOLID) {
        console.error(
          "Non-Shape detected in sceneShapes; " +
            "are you sure it is a TopoDS_Shape and not something else that needs to be converted to one?"
        );
        console.error(JSON.stringify(shape));
      }

      currentShape = new oc.TopoDS_Compound();
      sceneBuilder = new oc.BRep_Builder();
      sceneBuilder.MakeCompound(currentShape);
      let fullShapeEdgeHashes = {};
      let fullShapeFaceHashes: any = {};

      // Scan the edges and faces and add to the edge list
      Object.assign(
        fullShapeEdgeHashes,
        ForEachEdge(oc, shape, (_index:any, _edge:any) => {})
      );
      ForEachFace(oc, shape, (index:any, face: any) => {
        fullShapeFaceHashes[face.HashCode(100000000)] = index;
      });
      sceneBuilder.Add(currentShape, shape);

      let facesAndEdges = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      return facesAndEdges;
    } else if (payload.action === "createStairsRunBrep") {
      const {
        direction,
        isWithLanding,
        riserHeight,
        treadDepth,
        stairWidth1,
        stairWidth2,
        run1Steps,
        run2Steps,
      } = payload.data;
      const result = {
        run1: {},
        run2: {},
        landingOrWinder: {},
      };
      currentShape = new oc.TopoDS_Compound();
      let sceneBuilder = new oc.BRep_Builder();
      sceneBuilder.MakeCompound(currentShape);
      let fullShapeEdgeHashes = {};
      let fullShapeFaceHashes = {};

      // 1. stair run 1.
      const stepsLeftSideFacePoints = [];
      if (run1Steps < 2) {
        stepsLeftSideFacePoints.push(
          [-stairWidth1 / 2, treadDepth * run1Steps, riserHeight * run1Steps],
          [-stairWidth1 / 2, treadDepth, 0],
          [-stairWidth1 / 2, 0, 0]
        );
      } else {
        stepsLeftSideFacePoints.push(
          [-stairWidth1 / 2, treadDepth * run1Steps, riserHeight * run1Steps],
          [
            -stairWidth1 / 2,
            treadDepth * run1Steps,
            riserHeight * (run1Steps - 1),
          ],
          [-stairWidth1 / 2, treadDepth, 0],
          [-stairWidth1 / 2, 0, 0]
        );
        for (let n = 1; n < run1Steps; n++) {
          stepsLeftSideFacePoints.push(
            [-stairWidth1 / 2, treadDepth * (n - 1), riserHeight * n],
            [-stairWidth1 / 2, treadDepth * n, riserHeight * n]
          );
        }
      }

      stepsLeftSideFacePoints.push([
        -stairWidth1 / 2,
        treadDepth * (run1Steps - 1),
        riserHeight * run1Steps,
      ]);
      const stepsLeftSideFace = Polygon(oc, stepsLeftSideFacePoints, false);
      const stairRun1 = Extrude(oc, stepsLeftSideFace, [stairWidth1, 0, 0]);
      sceneBuilder.Add(currentShape, stairRun1);
      let mesh = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      result.run1 = {
        faces: mesh[0],
        edges: mesh[1],
      };
      sceneBuilder.Remove(currentShape, stairRun1);

      // 2. stair landing or winder.
      let landingOrWinder;
      if (isWithLanding) {
        const landingFace = Polygon(
          oc,
          [
            [
              -stairWidth1 / 2,
              treadDepth * run1Steps,
              riserHeight * (run1Steps - 1),
            ],
            [
              stairWidth1 / 2,
              treadDepth * run1Steps,
              riserHeight * (run1Steps - 1),
            ],
            [
              stairWidth1 / 2,
              treadDepth * run1Steps + stairWidth2,
              riserHeight * (run1Steps - 1),
            ],
            [
              -stairWidth1 / 2,
              treadDepth * run1Steps + stairWidth2,
              riserHeight * (run1Steps - 1),
            ],
          ],
          false
        );
        landingOrWinder = Extrude(oc, landingFace, [0, 0, 2 * riserHeight]);
      } else {
        const winderStep1Profile =
          direction === 1 // right
            ? Polygon(
              oc,
                [
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (1 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (1 + run1Steps),
                  ],
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2 / 2,
                    riserHeight * (1 + run1Steps),
                  ],
                ],
                false
              )
            : Polygon(
              oc,
                [
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (1 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (1 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2 / 2,
                    riserHeight * (1 + run1Steps),
                  ],
                ],
                false
              );
        const winderStep1 = Extrude(
          oc,
          winderStep1Profile,
          [0, 0, -3 * riserHeight],
        );
        const winderStep2Profile =
          direction === 1 // right
            ? Polygon(
              oc,
                [
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2 / 2,
                    riserHeight * (2 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (2 + run1Steps),
                  ],
                  [
                    0,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (2 + run1Steps),
                  ],
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (2 + run1Steps),
                  ],
                ],
                false
              )
            : Polygon(
              oc,
                [
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2 / 2,
                    riserHeight * (2 + run1Steps),
                  ],
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (2 + run1Steps),
                  ],
                  [
                    0,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (2 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (2 + run1Steps),
                  ],
                ],
                false
              );
        const winderStep2 = Extrude(
          oc,
          winderStep2Profile,
          [0, 0, -4 * riserHeight],
        );
        const winderStep3Profile =
          direction === 1 // right
            ? Polygon(
              oc,
                [
                  [
                    0,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (3 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (3 + run1Steps),
                  ],
                  [
                    stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (3 + run1Steps),
                  ],
                ],
                false
              )
            : Polygon(
              oc,
                [
                  [
                    0,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (3 + run1Steps),
                  ],
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps,
                    riserHeight * (3 + run1Steps),
                  ],
                  [
                    -stairWidth1 / 2,
                    treadDepth * run1Steps + stairWidth2,
                    riserHeight * (3 + run1Steps),
                  ],
                ],
                false
              );
        const winderStep3 = Extrude(
          oc,
          winderStep3Profile,
          [0, 0, -5 * riserHeight],
        );
        landingOrWinder = Union(oc, [winderStep1, winderStep2, winderStep3]);
        // cut the bottom.
        const cutBottom1Profile = Polygon(
          oc,
          [
          [
            -stairWidth1 / 2,
            treadDepth * run1Steps,
            riserHeight * (run1Steps - 1),
          ],
          [
            stairWidth1 / 2,
            treadDepth * run1Steps,
            riserHeight * (run1Steps - 1),
          ],
          [
            -stairWidth1 / 2,
            treadDepth * run1Steps + stairWidth2,
            riserHeight * (run1Steps + 1),
          ],
        ], false);
        const cutBottom1 = Extrude(
          oc,
          cutBottom1Profile,
          [0, 0, -5 * riserHeight],
        );
        const cutBottom2Profile = Polygon(oc, [
          [
            -stairWidth1 / 2,
            treadDepth * run1Steps + stairWidth2,
            riserHeight * (run1Steps + 1),
          ],
          [
            stairWidth1 / 2,
            treadDepth * run1Steps,
            riserHeight * (run1Steps - 1),
          ],
          [
            stairWidth1 / 2,
            treadDepth * run1Steps + stairWidth2,
            riserHeight * (run1Steps + 1),
          ],
        ], false);
        const cutBottom2 = Extrude(
          oc,
          cutBottom2Profile,
          [0, 0, -5 * riserHeight],
        );
        landingOrWinder = Difference(
          oc,
          landingOrWinder,
          [cutBottom1, cutBottom2],
        );
      }
      sceneBuilder.Add(currentShape, landingOrWinder);
      mesh = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      result.landingOrWinder = {
        faces: mesh[0],
        edges: mesh[1],
      };
      sceneBuilder.Remove(currentShape, landingOrWinder);

      // 3. stair run 2.
      const steps2LeftSideFacePoints = [];
      steps2LeftSideFacePoints.push(
        [-stairWidth2 / 2, treadDepth * run2Steps, riserHeight * run2Steps],
        [
          -stairWidth2 / 2,
          treadDepth * run2Steps,
          riserHeight * (run2Steps - 1),
        ],
        [-stairWidth2 / 2, 0, -riserHeight]
      );
      for (let n = 1; n < run2Steps; n++) {
        steps2LeftSideFacePoints.push(
          [-stairWidth2 / 2, treadDepth * (n - 1), riserHeight * n],
          [-stairWidth2 / 2, treadDepth * n, riserHeight * n]
        );
      }
      steps2LeftSideFacePoints.push([
        -stairWidth2 / 2,
        treadDepth * (run2Steps - 1),
        riserHeight * run2Steps,
      ]);
      const steps2LeftSideFace = Polygon(oc, steps2LeftSideFacePoints, false);
      const directionFactor = direction === 0 ? 1 : -1;
      let stair2 = Extrude(oc, steps2LeftSideFace, [stairWidth2, 0, 0]);
      stair2 = Rotate(oc, [0, 0, 1], directionFactor * 90, stair2);
      if (isWithLanding) {
        stair2 = Translate(
          oc,
          [
            (-directionFactor * stairWidth1) / 2,
            stairWidth2 / 2 + treadDepth * run1Steps,
            riserHeight * (run1Steps + 1),
          ],
          stair2,
        );
      } else {
        stair2 = Translate(
          oc,
          [
            (-directionFactor * stairWidth1) / 2,
            stairWidth2 / 2 + treadDepth * run1Steps,
            riserHeight * (3 + run1Steps),
          ],
          stair2,
        );
      }
      sceneBuilder.Add(currentShape, stair2);
      mesh = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      result.run2 = {
        faces: mesh[0],
        edges: mesh[1],
      };
      sceneBuilder.Remove(currentShape, stair2);
      return result;
    } else if (payload.action === "createRailingBrep") {
      const {
        riserHeight,
        treadDepth,
        width,
        steps,
        balusterWidth,
        balusterOffset1,
        balusterOffset2,
        balusterOffsetX,
        balusterOffsetY,
        handrailOffsetZ,
        handrailWidth,
        handrailHeight,
      } = payload.data;
      const result = {
        baluster1: {},
        baluster2: {},
        baluster3: {},
        handrail: {},
      };

      currentShape = new oc.TopoDS_Compound();
      let sceneBuilder = new oc.BRep_Builder();
      sceneBuilder.MakeCompound(currentShape);
      let fullShapeEdgeHashes = {};
      let fullShapeFaceHashes = {};

      // make a cut face.
      const cutFace = Polygon(
        oc,
        [
          [-width / 2, 0, handrailOffsetZ],
          [width / 2, 0, handrailOffsetZ],
          [
            width / 2,
            treadDepth * steps,
            handrailOffsetZ + riserHeight * steps,
          ],
          [
            -width / 2,
            treadDepth * steps,
            handrailOffsetZ + riserHeight * steps,
          ],
        ]
      );
      const cutSolid = Extrude(oc, cutFace, [0, 0, handrailOffsetZ]);

      const balusterProfileLeft = Polygon(
        oc,
        [
          [-balusterWidth / 2, balusterOffsetY, riserHeight],
          [balusterWidth / 2, balusterOffsetY, riserHeight],
          [balusterWidth / 2, balusterOffsetY + balusterWidth, riserHeight],
          [-balusterWidth / 2, balusterOffsetY + balusterWidth, riserHeight],
        ],
        false
      );
      let balusterShapeLeft = Extrude(
        oc,
        balusterProfileLeft,
        [0, 0, handrailOffsetZ]
      );
      balusterShapeLeft = Difference(oc, balusterShapeLeft, [cutSolid]);
      sceneBuilder.Add(currentShape, balusterShapeLeft);
      let mesh = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      result.baluster1 = {
        faces: mesh[0],
        edges: mesh[1],
      };
      sceneBuilder.Remove(currentShape, balusterShapeLeft);

      // const balusterProfileRight = Polygon(
      //     [
      //         [width/2 - balusterOffsetX, balusterOffsetY, riserHeight],
      //         [width/2 - balusterOffsetX - balusterWidth, balusterOffsetY, riserHeight],
      //         [width/2 - balusterOffsetX - balusterWidth, balusterOffsetY + balusterWidth, riserHeight],
      //         [width/2 - balusterOffsetX , balusterOffsetY + balusterWidth, riserHeight]
      //     ], false
      // );
      // let balusterShapeRight = Extrude(balusterProfileRight, [0,0,handrailOffsetZ], false);
      // balusterShapeRight = Difference(balusterShapeRight, [cutSolid]);
      // sceneBuilder.Add(currentShape, balusterShapeRight);

      for (let i = 1; i <= 1; i++) {
        const balusterProfileLeft1 = Polygon(
          oc,
          [
            [
              -balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset1,
              riserHeight * i,
            ],
            [
              +balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset1,
              riserHeight * i,
            ],
            [
              +balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset1 + balusterWidth,
              riserHeight * i,
            ],
            [
              -balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset1 + balusterWidth,
              riserHeight * i,
            ],
          ],
          false
        );
        let balusterShapeLeft1 = Extrude(
          oc,
          balusterProfileLeft1,
          [0, 0, handrailOffsetZ]
        );
        balusterShapeLeft1 = Difference(oc,balusterShapeLeft1, [cutSolid]);
        sceneBuilder.Add(currentShape, balusterShapeLeft1);
        mesh = ShapeToMesh(
          oc,
          currentShape,
          GUIState["MeshRes"] || 0.1,
          fullShapeEdgeHashes,
          fullShapeFaceHashes
        );
        result.baluster2 = {
          faces: mesh[0],
          edges: mesh[1],
        };
        sceneBuilder.Remove(currentShape, balusterShapeLeft1);

        const balusterProfileLeft2 = Polygon(
          oc,
          [
            [
              -balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset2,
              riserHeight * i,
            ],
            [
              balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset2,
              riserHeight * i,
            ],
            [
              balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset2 + balusterWidth,
              riserHeight * i,
            ],
            [
              -balusterWidth / 2,
              (i - 1) * treadDepth + balusterOffset2 + balusterWidth,
              riserHeight * i,
            ],
          ],
          false
        );
        let balusterShapeLeft2 = Extrude(
          oc,
          balusterProfileLeft2,
          [0, 0, handrailOffsetZ]
        );
        balusterShapeLeft2 = Difference(oc, balusterShapeLeft2, [cutSolid]);
        sceneBuilder.Add(currentShape, balusterShapeLeft2);
        mesh = ShapeToMesh(
          oc,
          currentShape,
          GUIState["MeshRes"] || 0.1,
          fullShapeEdgeHashes,
          fullShapeFaceHashes
        );
        result.baluster3 = {
          faces: mesh[0],
          edges: mesh[1],
        };
        sceneBuilder.Remove(currentShape, balusterShapeLeft2);
        // const balusterProfileRight1 = Polygon(
        //     [
        //         [width/2 - balusterOffsetX, (i-1)*treadDepth + balusterOffset1, riserHeight * i],
        //         [width/2 - balusterOffsetX - balusterWidth, (i-1)*treadDepth + balusterOffset1, riserHeight * i],
        //         [width/2 - balusterOffsetX - balusterWidth, (i-1)*treadDepth + balusterOffset1+balusterWidth, riserHeight*i],
        //         [width/2 - balusterOffsetX , (i-1)*treadDepth + balusterOffset1+balusterWidth, riserHeight * i]
        //     ], false
        // );
        // let balusterShapeRight1 = Extrude(balusterProfileRight1, [0,0,handrailOffsetZ], false);
        // balusterShapeRight1 = Difference(balusterShapeRight1, [cutSolid]);
        // sceneBuilder.Add(currentShape, balusterShapeRight1);

        // const balusterProfileRight2 = Polygon(
        //     [
        //         [width/2 - balusterOffsetX, (i-1)*treadDepth + balusterOffset2, riserHeight * i],
        //         [width/2 - balusterOffsetX - balusterWidth, (i-1)*treadDepth + balusterOffset2, riserHeight * i],
        //         [width/2 - balusterOffsetX - balusterWidth, (i-1)*treadDepth + balusterOffset2+balusterWidth, riserHeight*i],
        //         [width/2 - balusterOffsetX , (i-1)*treadDepth + balusterOffset2+balusterWidth, riserHeight * i]
        //     ], false
        // );
        // let balusterShapeRight2 = Extrude(balusterProfileRight2, [0,0,handrailOffsetZ], false);
        // balusterShapeRight2 = Difference(balusterShapeRight2, [cutSolid]);
        // sceneBuilder.Add(currentShape, balusterShapeRight2);
      }

      // handrail

      // const handrailLeftPosX =  balusterOffsetX + balusterWidth/2;
      // const handrailRightPosX = width/2 - balusterOffsetX - balusterWidth/2;
      const handrailProfileLeft = Polygon(
        oc,
        [
          [-handrailWidth / 2, 0, handrailOffsetZ],
          [handrailWidth / 2, 0, handrailOffsetZ],
          [handrailWidth / 2, 0, handrailOffsetZ + handrailHeight],
          [-handrailWidth / 2, 0, handrailOffsetZ + handrailHeight],
        ],
        false
      );
      const handrailShapeLeft = Extrude(
        oc,
        handrailProfileLeft,
        [0, treadDepth * steps, riserHeight * steps]
      );
      sceneBuilder.Add(currentShape, handrailShapeLeft);
      mesh = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      result.handrail = {
        faces: mesh[0],
        edges: mesh[1],
      };
      sceneBuilder.Remove(currentShape, handrailShapeLeft);
      // const handrailProfileRight = Polygon(
      //     [
      //         [handrailRightPosX - handrailWidth/2, 0, handrailOffsetZ],
      //         [handrailRightPosX + handrailWidth/2, 0, handrailOffsetZ],
      //         [handrailRightPosX + handrailWidth/2, 0, handrailOffsetZ + handrailHeight],
      //         [handrailRightPosX - handrailWidth/2, 0, handrailOffsetZ + handrailHeight]
      //     ], false
      // );
      // const handrailShapeRight = Extrude(handrailProfileRight, [
      //     0,
      //     treadDepth*steps,
      //     riserHeight*steps
      // ], false);
      // sceneBuilder.Add(currentShape, handrailShapeRight);

      // let facesAndEdges = ShapeToMesh(currentShape,
      //   GUIState["MeshRes"] || 0.1, fullShapeEdgeHashes, fullShapeFaceHashes);
      return result;
    } else if (payload.action === "createStraightWallBrep") {
      const {
        start,
        startNormal,
        end,
        endNormal,
        thickness,
        height,
        openings,
      } = payload.data;
      const startPnt = new Vector3(start.x, start.y, start.z);
      const endPnt = new Vector3(end.x, end.y, end.z);
      const drivingDirection = new Vector3()
        .subVectors(endPnt, startPnt)
        .normalize();
      const normal = new Vector3(0, 0, 1);
      const rightHandDirection = new Vector3()
        .crossVectors(drivingDirection, normal)
        .normalize();
      const leftHandDirection = rightHandDirection.clone().negate();

      let startRightHandDirection = new Vector3()
        .crossVectors(drivingDirection, normal)
        .normalize();
      if (startNormal) {
        // the cosangle could be negative so that it will determine the direction of right/left hand direction.
        const cosangle = startRightHandDirection.dot(startNormal);
        const newThickness = thickness / cosangle;
        startRightHandDirection = new Vector3(
          startNormal.x,
          startNormal.y,
          startNormal.z
        ).multiplyScalar(newThickness / 2);
      } else {
        startRightHandDirection = startRightHandDirection.multiplyScalar(
          thickness / 2
        );
      }
      const startLeftHandDirection = startRightHandDirection.clone().negate();
      let endRightHandDirection = new Vector3()
        .crossVectors(drivingDirection, normal)
        .normalize();
      if (endNormal) {
        // the cosangle could be negative so that it will determine the direction of right/left hand direction.
        const cosangle = endRightHandDirection.dot(endNormal);
        const newThickness = thickness / cosangle;
        endRightHandDirection = new Vector3(
          endNormal.x,
          endNormal.y,
          endNormal.z
        ).multiplyScalar(newThickness / 2);
      } else {
        endRightHandDirection = endRightHandDirection.multiplyScalar(
          thickness / 2
        );
      }
      const endLeftHandDirection = endRightHandDirection.clone().negate();
      const polygon = new Array<Vector3>();
      // we need to keep the points in clockwise.
      polygon.push(startPnt.clone().add(startRightHandDirection));
      polygon.push(endPnt.clone().add(endRightHandDirection));
      polygon.push(endPnt.clone().add(endLeftHandDirection));
      polygon.push(startPnt.clone().add(startLeftHandDirection));
      const direction = normal.clone().multiplyScalar(height);

      const wallProfile = Polygon(
        oc,
        polygon.map((p) => [p.x, p.y, p.z])
      );
      let shape = Extrude(
        oc,
        wallProfile,
        [direction.x, direction.y, direction.z]
      );
      console.log(
        `let wallProfile = Polygon([${polygon
          .map((p) => `[${p.x}, ${p.y}, ${p.z}]`)
          .join(",")}], false);`
      );
      console.log(
        `let wall =Extrude(wallProfile, [${direction.x}, ${direction.y}, ${direction.z}], false);`
      );

      const openingSolids: any[] = [];
      openings.forEach(
        (opening: {
          offset: { x: number; y: number };
          width: number;
          height: number;
        }) => {
          // move to leftHandDirection, and extrude to rightHandDirection.
          const leftHandDirection2 = new Vector3()
            .copy(leftHandDirection)
            .multiplyScalar(5 * thickness);
          const rightHandDirection2 = leftHandDirection2
            .clone()
            .negate()
            .multiplyScalar(5);
          const o1 = new Vector3()
            .addVectors(
              startPnt,
              drivingDirection
                .clone()
                .multiplyScalar(opening.offset.x - opening.width / 2)
            )
            .add(new Vector3(0, 0, opening.offset.y - opening.height / 2))
            .add(leftHandDirection2);
          const o2 = new Vector3()
            .addVectors(
              startPnt,
              drivingDirection
                .clone()
                .multiplyScalar(opening.offset.x + opening.width / 2)
            )
            .add(new Vector3(0, 0, opening.offset.y - opening.height / 2))
            .add(leftHandDirection2);
          const o3 = new Vector3()
            .addVectors(
              startPnt,
              drivingDirection
                .clone()
                .multiplyScalar(opening.offset.x + opening.width / 2)
            )
            .add(new Vector3(0, 0, opening.offset.y + opening.height / 2))
            .add(leftHandDirection2);
          const o4 = new Vector3()
            .addVectors(
              startPnt,
              drivingDirection
                .clone()
                .multiplyScalar(opening.offset.x - opening.width / 2)
            )
            .add(new Vector3(0, 0, opening.offset.y + opening.height / 2))
            .add(leftHandDirection2);

          const openingProfile = Polygon(
            oc,
            [o1, o2, o3, o4].map((p) => [p.x, p.y, p.z])
          );
          const openingSolid = Extrude(
            oc,
            openingProfile,
            [
              rightHandDirection2.x,
              rightHandDirection2.y,
              rightHandDirection2.z,
            ]
          );
          const openingPolygonString = [o1, o2, o3, o4]
            .map((p) => `[${p.x}, ${p.y}, ${p.z}]`)
            .join(",");
          console.log(
            `let openingProfile = Polygon([${openingPolygonString}], false);`
          );
          console.log(
            `let opening =Extrude(openingProfile, [${rightHandDirection2.x}, ${rightHandDirection2.y}, ${rightHandDirection2.z}], false);`
          );
          openingSolids.push(openingSolid);
        }
      );

      if (openingSolids.length > 0) {
        shape = Difference(oc, shape, openingSolids);
      }


      if (shape.ShapeType() !== oc.TopAbs_ShapeEnum.TopAbs_SOLID) {
        console.error(
          "Non-Shape detected in sceneShapes; " +
            "are you sure it is a TopoDS_Shape and not something else that needs to be converted to one?"
        );
        console.error(JSON.stringify(shape));
      }

      currentShape = new oc.TopoDS_Compound();
      let sceneBuilder = new oc.BRep_Builder();
      sceneBuilder.MakeCompound(currentShape);
      let fullShapeEdgeHashes: any = {};
      let fullShapeFaceHashes: any = {};

      // Scan the edges and faces and add to the edge list
      Object.assign(
        fullShapeEdgeHashes,
        ForEachEdge(oc, shape, (_index: number, _edge: any) => {})
      );
      ForEachFace(oc, shape, (index: number, face: any) => {
        fullShapeFaceHashes[face.HashCode(100000000)] = index;
      });
      sceneBuilder.Add(currentShape, shape);

      let facesAndEdges = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      return facesAndEdges;
    } else if (payload.action === "createArcWallBrep") {
      const { arcData, thickness, height, openings } = payload.data;
      const wallProfile = MakeFaceWithArcInformation(
        oc,
        {
          center: { x: arcData.center.x, y: arcData.center.y },
          startAngle: arcData.startAngle,
          endAngle: arcData.endAngle,
          radius: arcData.radius,
        },
        thickness
      );
      const normal = new Vector3(0, 0, 1);
      const direction = normal.clone().multiplyScalar(height);
      let shape = Extrude(
        oc,
        wallProfile,
        [direction.x, direction.y, direction.z]
      );
      console.log(
        `let wallProfile = MakeFaceWithArcInformation({center: {x: ${arcData.center.x}, y: ${arcData.center.y}},startAngle: ${arcData.startAngle},endAngle: ${arcData.endAngle}, radius: ${arcData.radius}}, ${thickness});`
      );
      console.log(
        `let wall =Extrude(wallProfile, [${direction.x}, ${direction.y}, ${direction.z}], false);`
      );

      const openingSolids: any[] = [];
      openings.forEach(
        (opening: {
          profile: Array<{ x: number; y: number }>;
          position: { x: number; y: number; z: number };
          rotation: { x: number; y: number; z: number };
        }) => {
          // move to leftHandDirection, and extrude to rightHandDirection.
          const openingProfile = Polygon(
            oc,
            opening.profile.map((p) => [p.x, p.y, -thickness * 2])
          );
          let openingSolid = Extrude(
            oc,
            openingProfile,
            [0, 0, thickness * 4]
          );
          const openingPolygonString = opening.profile
            .map((p) => `[${p.x}, ${p.y}, ${-thickness * 2}]`)
            .join(",");
          const openingDirectionString = `[0, 0, ${thickness * 4}]`;
          console.log(
            `let openingProfile = Polygon([${openingPolygonString}], false);`
          );
          console.log(
            `let opening =Extrude(openingProfile, ${openingDirectionString}, false);`
          );
          console.log(
            `opening = Rotate([0,0,1], ${opening.rotation.z} * 180 /Math.PI, opening, false);`
          );
          console.log(
            `opening = Rotate([0,1,0], ${opening.rotation.y} * 180 /Math.PI, opening, false);`
          );
          console.log(
            `opening = Rotate([1,0,0], ${opening.rotation.x} * 180 /Math.PI, opening, false);`
          );
          console.log(
            `opening = Translate([${opening.position.x}, ${opening.position.y}, ${opening.position.z}], opening, false)`
          );
          openingSolid = Rotate(
            oc,
            [0, 0, 1],
            (opening.rotation.z * 180) / Math.PI,
            openingSolid
          );
          openingSolid = Rotate(
            oc,
            [0, 1, 0],
            (opening.rotation.y * 180) / Math.PI,
            openingSolid
          );
          openingSolid = Rotate(
            oc,
            [1, 0, 0],
            (opening.rotation.x * 180) / Math.PI,
            openingSolid
          );
          openingSolid = Translate(
            oc,
            [opening.position.x, opening.position.y, opening.position.z],
            openingSolid
          );
          openingSolids.push(openingSolid);
        }
      );

      if (openingSolids.length > 0) {
        shape = Difference(oc, shape, openingSolids);
      }


      if (shape.ShapeType() !== oc.TopAbs_ShapeEnum.TopAbs_SOLID) {
        console.error(
          "Non-Shape detected in sceneShapes; " +
            "are you sure it is a TopoDS_Shape and not something else that needs to be converted to one?"
        );
        console.error(JSON.stringify(shape));
      }

      currentShape = new oc.TopoDS_Compound();
      let sceneBuilder = new oc.BRep_Builder();
      sceneBuilder.MakeCompound(currentShape);
      let fullShapeEdgeHashes: any = {};
      let fullShapeFaceHashes: any = {};

      // Scan the edges and faces and add to the edge list
      Object.assign(
        fullShapeEdgeHashes,
        ForEachEdge(oc, shape, (_index: number, _edge: any) => {})
      );
      ForEachFace(oc, shape, (index: number, face: any) => {
        fullShapeFaceHashes[face.HashCode(100000000)] = index;
      });
      sceneBuilder.Add(currentShape, shape);

      let facesAndEdges = ShapeToMesh(
        oc,
        currentShape,
        GUIState["MeshRes"] || 0.1,
        fullShapeEdgeHashes,
        fullShapeFaceHashes
      );
      return facesAndEdges;
    }
    else { // eval the code directly.
      try {
        sceneShapes.length = 0;
        // I have tried to follow the https://esbuild.github.io/content-types/#direct-eval
        // to use `var eval2 = eval; eval2(payload.code);` but the scope doesn't recognize
        // the NewSphere method. So rollback to the original one `eval(payload.code)` with the 
        // es-build compile warning.
        eval(payload.code);
        return sceneShapes.map((shape: any) => {
          return ShapeToMesh(oc, shape,
            0.1, {}, {});
        });
      } catch (e: any) {
        console.log(e);
      }      
    }
  } catch (e) {
    setTimeout(() => {
      throw e;
    }, 0);
  } finally {
    postMessage({ type: "resetWorking" });
  }
});
