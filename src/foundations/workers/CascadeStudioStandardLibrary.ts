import { TopoDS_Shape } from "opencascade.js/dist/module.TKBRep.wasm";
import { openCascadeInstance } from "opencascade.js/dist/opencascade";
import { Arc, CurveType, Line } from "./CascadeMainWorker.worker";

export const MakeWireWithLoop = (oc: openCascadeInstance, loop: any, elevation: number) => {
  const polygonWire = new oc.BRepBuilderAPI_MakeWire_1();
  for(let i=0; i<loop.length; i++) {
    const curve = loop[i];
    if (curve.type === 0) { // line
      const lineEdge = new oc.BRepBuilderAPI_MakeEdge_3(
        new oc.gp_Pnt_3(curve.x1, curve.y1, elevation),
        new oc.gp_Pnt_3(curve.x2, curve.y2, elevation)).Edge();
      const lineWire = new oc.BRepBuilderAPI_MakeWire_2(lineEdge).Wire();
      polygonWire.Add_2(lineWire);
    } else if(curve.type === 2) { // arc
      const arcEdge = new oc.BRepBuilderAPI_MakeEdge_9(
        new oc.gp_Circ_2(
          new oc.gp_Ax2_3(new oc.gp_Pnt_3(curve.center.x, curve.center.y, 0),
          new oc.gp_Dir_4(0, 0, 1)), curve.radius
          ),
          curve.startAngle, curve.endAngle
      ).Edge();
      const arcWire = new oc.BRepBuilderAPI_MakeWire_2(arcEdge).Wire();
      polygonWire.Add_2(arcWire);
    }
  }
  return polygonWire.Wire();
}


// loop: Array<LineData|ArcData>
export const MakeFaceWithLoop = (oc: openCascadeInstance, loop: any, elevation: number) => {
  const finalWire = MakeWireWithLoop(oc, loop, elevation);
  const curPolygon = new oc.BRepBuilderAPI_MakeFace_15(finalWire, false).Face();
  return curPolygon;
}

/*
* loops: Array<Array<LineData|ArcData>>
* loops[0] is the outer loop, clockwise.
* loops[1...n] is the holes, anti-clockwise.
*/
export const MakeFaceWithLoops = (oc: openCascadeInstance, loops: any, elevation: number) => {
  const outloop = loops[0];
  let face = MakeFaceWithLoop(oc, outloop, elevation);
  face = new oc.BRepBuilderAPI_MakeFace_2(face);
  for(let i=1; i<loops.length; i++) {
    const hole = MakeWireWithLoop(oc, loops[i], elevation);
    // The holes must be null or instance of TopoDS_Wire.
    // Will throw an error when got an instance of TopoDS_Shape.
    if (hole.Orientation_1() === oc.TopAbs_Orientation.TopAbs_FORWARD) {
      hole.Reverse();
    }
    face.Add(hole);
  }
  return face.Face();
}


export const Extrude = (oc: openCascadeInstance, face: any, direction: number[]): TopoDS_Shape => {
  const curExtrusion = new oc.BRepPrimAPI_MakePrism_1(face,
      new oc.gp_Vec_4(direction[0], direction[1], direction[2]), false, true);
  return curExtrusion.Shape();
}

export const ForEachEdge = (oc: openCascadeInstance, shape: TopoDS_Shape, callback: any) => {
  const edgeHashes: any = {};
  let edgeIndex = 0;
  const anExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (anExplorer.Init(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE); anExplorer.More(); anExplorer.Next()) {
    const edge = oc.TopoDS.Edge_1(anExplorer.Current());
    const edgeHash = edge.HashCode(100000000);
    if(!edgeHashes.hasOwnProperty(edgeHash)){
      edgeHashes[edgeHash] = edgeIndex;
      callback(edgeIndex++, edge);
    }
  }
  return edgeHashes;
}

export const ForEachFace = (oc: openCascadeInstance, shape: TopoDS_Shape, callback: any) => {
  let face_index = 0;
  const anExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (anExplorer.Init(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE); anExplorer.More(); anExplorer.Next()) {
    callback(face_index++, oc.TopoDS.Face_1(anExplorer.Current()));
  }
}

/** This function converts either single dimensional 
 * array or a gp_Pnt to a gp_Pnt.  Does not accept 
 * `TopoDS_Vertex`'s yet! */
export const convertToPnt = (oc: openCascadeInstance, pnt: number[]) => {
  let point: any = pnt; // Accept raw gp_Points if we got 'em
  if (point.length) {
    point = new oc.gp_Pnt_3(point[0], point[1], (point[2])?point[2]:0);
  }
  return point;
}

export const Polygon = (oc: openCascadeInstance, points: number[][], wire = false) => {
  const gpPoints = [];
  for (let ind = 0; ind < points.length; ind++) {
    gpPoints.push(convertToPnt(oc, points[ind]));
  }

  const polygonWire = new oc.BRepBuilderAPI_MakeWire_1();
  for (let ind = 0; ind < points.length - 1; ind++) {
    // let seg = new oc.GC_MakeSegment_1(gpPoints[ind], gpPoints[ind + 1]).Value();
    const edge = new oc.BRepBuilderAPI_MakeEdge_3(gpPoints[ind], gpPoints[ind + 1]).Edge();
    const innerWire = new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
    polygonWire.Add_2(innerWire);
  }
  // let seg2 = new oc.GC_MakeSegment(gpPoints[points.length - 1], gpPoints[0]).Value();
  const edge2 = new oc.BRepBuilderAPI_MakeEdge_3(gpPoints[points.length - 1], gpPoints[0]).Edge();
  const innerWire2 = new oc.BRepBuilderAPI_MakeWire_2(edge2).Wire();
  polygonWire.Add_2(innerWire2);
  const finalWire = polygonWire.Wire();

  if (wire) {
    return finalWire;
  } else {
    return new oc.BRepBuilderAPI_MakeFace_15(finalWire, false).Face();
  }
}


// TODO: These ops can be more cache optimized since they're multiple sequential ops
export const Union = (oc: openCascadeInstance, objectsToJoin: any, fuzzValue = 0, keepEdges = false) => {
  if (!fuzzValue) { fuzzValue = 0.1; }

  let combined = objectsToJoin[0];
  if (objectsToJoin.length > 1) {
    for (let i = 0; i < objectsToJoin.length; i++) {
      if (i > 0) {
        const combinedFuse = new oc.BRepAlgoAPI_Fuse_3(combined, objectsToJoin[i], new oc.Message_ProgressRange_1());
        // combinedFuse.SetFuzzyValue(fuzzValue);
        combinedFuse.Build(new oc.Message_ProgressRange_1());
        combined = combinedFuse.Shape();
      }
    }
  }

  if (!keepEdges) {
    const fusor = new oc.ShapeUpgrade_UnifySameDomain_2(combined, true, true, false); 
    fusor.Build();
    combined = fusor.Shape();
  }
  return combined;
}

export const Difference = (
  oc: openCascadeInstance, 
  mainBody: any, 
  objectsToSubtract: any, 
  fuzzValue = 0.1, 
  keepEdges = false
  ) => {
  if (!fuzzValue) { fuzzValue = 0.1; }
  if (!mainBody || mainBody.IsNull()) { console.error("Main Shape in Difference is null!"); }
  
  let difference = mainBody;
  if (objectsToSubtract.length >= 1) {
    for (let i = 0; i < objectsToSubtract.length; i++) {
      if (!objectsToSubtract[i] || objectsToSubtract[i].IsNull()) { console.error("Tool in Difference is null!"); }
      const differenceCut = new oc.BRepAlgoAPI_Cut_3(difference, objectsToSubtract[i], new oc.Message_ProgressRange_1());
      // differenceCut.SetFuzzyValue(fuzzValue);
      differenceCut.Build(new oc.Message_ProgressRange_1());
      difference = differenceCut.Shape();
    }
  }
  
  if (!keepEdges) {
    const fusor = new oc.ShapeUpgrade_UnifySameDomain_2(difference, true, true, false); 
    fusor.Build();
    difference = fusor.Shape();
  }
  return difference;
}

/** This function returns true if item is indexable like an array. */
function isArrayLike(item: any) {
  return (
      Array.isArray(item) || 
      (!!item &&
        typeof item === "object" &&
        item.hasOwnProperty("length") && 
        typeof item.length === "number" && 
        item.length > 0 && 
        (item.length - 1) in item
      )
  );
}

export const Translate = (
  oc: openCascadeInstance, 
  offset: number[], 
  shapes: TopoDS_Shape[] | TopoDS_Shape
  ) => {
  const transformation = new oc.gp_Trsf_1();
  transformation.SetTranslation_1(new oc.gp_Vec_4(offset[0], offset[1], offset[2]));
  const translation = new oc.TopLoc_Location_2(transformation);
  if (!isArrayLike(shapes)) {
    return shapes.Moved(translation, true);
  } else if (shapes.length >= 1) {      // Do the normal translation
    const newTrans = [];
    for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex++) {
      newTrans.push(shapes[shapeIndex].Moved(translation, true));
    }
    return newTrans;
  }
}

export const Rotate = (
  oc: openCascadeInstance, 
  axis: number[], 
  degrees: number, 
  shapes: any) => {
  let rotated = null;
  if (degrees === 0) {
    rotated = shapes;
  } else {
    let newRot;
    const transformation = new oc.gp_Trsf_1();
    transformation.SetRotation_1(
      new oc.gp_Ax1_2(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_4(axis[0], axis[1], axis[2])), degrees * 0.0174533);
    const rotation = new oc.TopLoc_Location_2(transformation);
    if (!isArrayLike(shapes)) {
      newRot = shapes.Moved(rotation, true);
    } else if (shapes.length >= 1) {      // Do the normal rotation
      for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex++) {
        shapes[shapeIndex].Move(rotation);
      }
    }
    return newRot;
  }
}


const getPointOfArc = function (arcData: any, t: number ) {
	const twoPi = Math.PI * 2;
	let deltaAngle = arcData.endAngle - arcData.startAngle;
	const samePoints = Math.abs( deltaAngle ) < Number.EPSILON;

	// ensures that deltaAngle is 0 .. 2 PI
	while ( deltaAngle < 0 ) deltaAngle += twoPi;
	while ( deltaAngle > twoPi ) deltaAngle -= twoPi;
	if ( deltaAngle < Number.EPSILON ) {
		if ( samePoints ) {
			deltaAngle = 0;
		} else {
			deltaAngle = twoPi;
		}
	}

	if ( arcData.clockwise === true && ! samePoints ) {
		if ( deltaAngle === twoPi ) {
			deltaAngle = - twoPi;
		} else {
			deltaAngle = deltaAngle - twoPi;
		}
	}

	const angle = arcData.startAngle + t * deltaAngle;
	const x = arcData.center.x + arcData.radius * Math.cos( angle );
	const y = arcData.center.y + arcData.radius * Math.sin( angle );
	return {x, y};
};

export const ArcWithCurveData = (oc: openCascadeInstance, arcCurve: Arc) => {
  const innerArcEdge = new oc.BRepBuilderAPI_MakeEdge_9(
    new oc.gp_Circ_2(
        new oc.gp_Ax2_3(new oc.gp_Pnt_3(arcCurve.center.x, arcCurve.center.y, arcCurve.center.z),
        new oc.gp_Dir_4(arcCurve.mainDirection.x, arcCurve.mainDirection.y, arcCurve.mainDirection.z)), 
        // new oc.gp_Dir_4(0, 0, 1)), 
        arcCurve.radius
      ),
      arcCurve.startAngle, arcCurve.endAngle
  ).Edge();
  return new oc.BRepBuilderAPI_MakeWire_2(innerArcEdge).Wire();
};

export const LineWithCurveData = (oc: openCascadeInstance, lineCurve: Line) => {
  const start = new oc.gp_Pnt_3(lineCurve.start.x, lineCurve.start.y, lineCurve.start.z);
  const end = new oc.gp_Pnt_3(lineCurve.end.x, lineCurve.end.y, lineCurve.end.z);
  const edge = new oc.BRepBuilderAPI_MakeEdge_3(start, end).Edge();
  return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
};


export const FaceWithCurveLoop = (
  oc: openCascadeInstance,
  curveLoop: Array<Arc | Line>
): any => {
  const polygonWire = new oc.BRepBuilderAPI_MakeWire_1();

  for( let i=0; i<curveLoop.length; i++) {
    const curve = curveLoop[i];
    if (curve.curveType === CurveType.ARC) {
      const arcCurve = curve as Arc;
      const innerArcEdge = new oc.BRepBuilderAPI_MakeEdge_9(
        new oc.gp_Circ_2(
          new oc.gp_Ax2_3(new oc.gp_Pnt_3(arcCurve.center.x, arcCurve.center.y, arcCurve.center.z),
          new oc.gp_Dir_4(0, 0, 1)), arcCurve.radius
          ),
          arcCurve.startAngle, arcCurve.endAngle
      ).Edge();
      const innerArcWire = new oc.BRepBuilderAPI_MakeWire_2(innerArcEdge).Wire();
      polygonWire.Add_2(innerArcWire);
    } else if (curve.curveType === CurveType.LINE) {
      const lineCurve = curve  as Line;
      const start = new oc.gp_Pnt_3(lineCurve.start.x, lineCurve.start.y, lineCurve.start.z);
      const end = new oc.gp_Pnt_3(lineCurve.end.x, lineCurve.end.y, lineCurve.end.z);
      const edge = new oc.BRepBuilderAPI_MakeEdge_3(start, end).Edge();
      const innerWire = new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
      polygonWire.Add_2(innerWire);
    }
  }
  const finalWire = polygonWire.Wire();
  const curPolygon = new oc.BRepBuilderAPI_MakeFace_15(finalWire, false).Face();
  return curPolygon;
}



export const MakeFaceWithArcInformation = (
  oc: openCascadeInstance, 
  arcData: any, 
  thickness: number
  ) => {
  const innerArcRadius = arcData.radius - thickness/2;
  const outerArcRadius = arcData.radius + thickness/2;
  const innerArcData = {
    center: arcData.center,
    radius: innerArcRadius,
    startAngle: arcData.startAngle,
    endAngle: arcData.endAngle,
    clockwise: true
  };
  const outerArcData = {
    center: arcData.center,
    radius: outerArcRadius,
    startAngle: arcData.startAngle,
    endAngle: arcData.endAngle,
    clockwise: true
  };

  const polygonWire = new oc.BRepBuilderAPI_MakeWire_1();
  // inner arc.
  const innerArcEdge = new oc.BRepBuilderAPI_MakeEdge_9(
    new oc.gp_Circ_2(
      new oc.gp_Ax2_3(new oc.gp_Pnt_3(arcData.center.x, arcData.center.y, 0),
      new oc.gp_Dir_4(0, 0, 1)), innerArcRadius
      ),
      arcData.startAngle, arcData.endAngle
  ).Edge();
  const innerArcWire = new oc.BRepBuilderAPI_MakeWire_2(innerArcEdge).Wire();
  polygonWire.Add_2(innerArcWire);

  // inner arc.end to outer arc.end.
  const innerArcEndPnt = getPointOfArc(innerArcData, 1);
  const outerArcEndPnt = getPointOfArc(outerArcData, 1);
  const edgeie2oe = new oc.BRepBuilderAPI_MakeEdge_3(
    new oc.gp_Pnt_3(innerArcEndPnt.x, innerArcEndPnt.y, 0),
    new oc.gp_Pnt_3(outerArcEndPnt.x, outerArcEndPnt.y, 0)).Edge();
  const ie2oeWire = new oc.BRepBuilderAPI_MakeWire_2(edgeie2oe).Wire();
  polygonWire.Add_2(ie2oeWire);

  // outer arc.
  const outerArcEdge = new oc.BRepBuilderAPI_MakeEdge_9(
    new oc.gp_Circ_2(new oc.gp_Ax2_3(new oc.gp_Pnt_3(arcData.center.x, arcData.center.y, 0),
    new oc.gp_Dir_4(0, 0, 1)), outerArcRadius), arcData.startAngle, arcData.endAngle).Edge();
  const outerArcWire = new oc.BRepBuilderAPI_MakeWire_2(outerArcEdge).Wire();
  polygonWire.Add_2(outerArcWire);

  // outer arc.start to inner arc.start.
  const innerArcStartPnt = getPointOfArc(innerArcData, 0);
  const outerArcStartPnt = getPointOfArc(outerArcData, 0);
  const edgeos2is = new oc.BRepBuilderAPI_MakeEdge_3(new oc.gp_Pnt_3(outerArcStartPnt.x, outerArcStartPnt.y, 0),
  new oc.gp_Pnt_3(innerArcStartPnt.x, innerArcStartPnt.y, 0)).Edge();
  const os2isWire = new oc.BRepBuilderAPI_MakeWire_2(edgeos2is).Wire();
  polygonWire.Add_2(os2isWire);

  const finalWire = polygonWire.Wire();
  const curPolygon = new oc.BRepBuilderAPI_MakeFace_15(finalWire, false).Face();
  return curPolygon;
}

export const ShapeToMesh = (
  oc: openCascadeInstance, 
  shape: TopoDS_Shape, 
  maxDeviation: number, 
  fullShapeEdgeHashes: any, 
  fullShapeFaceHashes: any
  ) => {
  const facelist: any[] = [], edgeList: any[] = [];
  try {
    // shape = new oc.TopoDS_Shape(shape);

    // Set up the Incremental Mesh builder, with a precision
    new oc.BRepMesh_IncrementalMesh_2(shape, maxDeviation, false, maxDeviation * 5, false);

    // Construct the edge hashes to assign proper indices to the edges
    const fullShapeEdgeHashes2: any = {};

    // Iterate through the faces and triangulate each one
    const triangulations: any[] = [];
    ForEachFace(oc, shape, (faceIndex: number, myFace: any) => {
      const tShape = myFace.TShape_1();
      const tShapeType = tShape.get().ShapeType().value; // 
      let faceGeometryHanlder;
      switch(tShapeType) {
        case oc.TopAbs_ShapeEnum.TopAbs_FACE.value:
          faceGeometryHanlder = tShape.get().Surface_1();
          break;
        default:
          break;
      }

      let surface;
      if (faceGeometryHanlder) {
        // https://ocjs.org/docs/advanced/differences-cpp-js/references-to-built-ins
        const u0 = { current: 0 };
        const u1 = { current: 0 };
        const v0 = { current: 0 };
        const v1 = { current: 0 };
        oc.BRepTools.UVBounds_1(myFace, u0, u1, v0, v1);
        const surfaceTypename = faceGeometryHanlder.get().$$.ptrType.name;
        if (surfaceTypename === 'Geom_Plane*') {
          const gpPlane = faceGeometryHanlder.get().Pln();
          const xAxis = gpPlane.XAxis().Direction();
          const yAxis = gpPlane.YAxis().Direction();
          const location = gpPlane.Location();
          surface = {
            type: 'plane',
            origin: {x: location.X(), y: location.Y(), z: location.Z()}, 
            xAxis: {x: xAxis.X(), y: xAxis.Y(), z: xAxis.Z()}, 
            yAxis: {x: yAxis.X(), y: yAxis.Y(), z: yAxis.Z()},
            bounds: {u0, u1, v0, v1}
          };
          // console.log(`Geom_Plane = {origin: {x: ${location.X()}, y: ${location.Y()}, z: ${location.Z()}}, xAxis: {x: ${
          //   xAxis.X()}, y: ${xAxis.Y()}, z: ${xAxis.Z()}}, yAxis: {x: ${yAxis.X()}, y: ${yAxis.Y()}, z: ${yAxis.Z()}}, UV: {u0: ${u0.current
          //   }, u1: ${u1.current}, v0: ${v0.current}, v1: ${v1.current}}`);
        } else if (surfaceTypename === 'Geom_CylindricalSurface*') {
          const axis = faceGeometryHanlder.get().Position();
          const location = axis.Location();
          const xAxis = axis.XDirection();
          const yAxis = axis.YDirection();
          const zAxis = axis.Direction();
          const radius = faceGeometryHanlder.get().Radius();
          surface = {
            type: 'cylindricalSurface',
            origin: {x: location.X(), y: location.Y(), z: location.Z()},
            radius,
            xAxis: {x: xAxis.X(), y: xAxis.Y(), z: xAxis.Z()}, 
            yAxis: {x: yAxis.X(), y: yAxis.Y(), z: yAxis.Z()},
            zAxis: {x: zAxis.X(), y: zAxis.Y(), z: zAxis.Z()},
            bounds: {u0, u1, v0, v1}
          };
        }
      }


      const aLocation = new oc.TopLoc_Location_1();
      const myT = oc.BRep_Tool.Triangulation(myFace, aLocation, 0 /*Poly_MeshPurpose.Poly_MeshPurpose_NONE*/);
      if (myT.IsNull()) { console.error("Encountered Null Face!"); return; }

      const this_face: any = {
        vertex_coord: [],
        normal_coord: [],
        uv_coord: [],
        tri_indexes: [],
        number_of_triangles: 0,
        face_index: fullShapeFaceHashes[myFace.HashCode(100000000)],
        edge_indices: [],
        surface
      };

      const pc = new oc.Poly_Connect_2(myT);
      const numberOfNodes: number = myT.get().NbNodes(); // Note: index start from 1 (not 0)

      // write vertex buffer
      this_face.vertex_coord = new Array(numberOfNodes * 3);
      for(let i = 0; i < numberOfNodes; i++) {
        const p = myT.get().Node(i + 1).Transformed(aLocation.Transformation());
        this_face.vertex_coord[(i * 3) + 0] = p.X();
        this_face.vertex_coord[(i * 3) + 1] = p.Y();
        this_face.vertex_coord[(i * 3) + 2] = p.Z();
      }

      // write normal buffer
      if (myT.get().HasNormals()) {
        this_face.normal_coord = new Array(numberOfNodes * 3);
        for(let i = 0; i < numberOfNodes; i++) {
          const d = myT.get().Normal(i + 1).Transformed(aLocation.Transformation());
          this_face.normal_coord[(i * 3)+ 0] = d.X();
          this_face.normal_coord[(i * 3)+ 1] = d.Y();
          this_face.normal_coord[(i * 3)+ 2] = d.Z();
        }
      }

      // write vertex uv buffer
      if (myT.get().HasUVNodes()) {
        this_face.uv_coord = new Array(numberOfNodes*2);
        for(let i = 0; i < numberOfNodes; i++) {
          const p = myT.get().UVNode(i + 1);
          this_face.uv_coord[(i * 2) + 0] = p.X();
          this_face.uv_coord[(i * 2) + 1] = p.Y();
        }
      }
      
      // write triangle buffer
      const orient = myFace.Orientation_1();
      const triangles = myT.get().Triangles();
      this_face.tri_indexes = new Array(triangles.Length() * 3);
      let validFaceTriCount = 0;
      for(let nt = 1; nt <= myT.get().NbTriangles(); nt++) {
        const t = triangles.Value(nt);
        let n1 = t.Value(1);
        let n2 = t.Value(2);
        const n3 = t.Value(3);
        if(orient !== oc.TopAbs_Orientation.TopAbs_FORWARD) {
          const tmp = n1;
          n1 = n2;
          n2 = tmp;
        }
        // if(TriangleIsValid(Nodes.Value(1), Nodes.Value(n2), Nodes.Value(n3))) {
          this_face.tri_indexes[(validFaceTriCount * 3) + 0] = n1 - 1;
          this_face.tri_indexes[(validFaceTriCount * 3) + 1] = n2 - 1;
          this_face.tri_indexes[(validFaceTriCount * 3) + 2] = n3 - 1;
          validFaceTriCount++;
        // }
      }
      this_face.number_of_triangles = validFaceTriCount;

      ForEachEdge(oc, myFace, (index: number, myEdge: any) => {
        const edgeHash = myEdge.HashCode(100000000);
        if (fullShapeEdgeHashes2.hasOwnProperty(edgeHash)) {
          const this_edge: any = {
            vertex_coord: [],
            edge_index: -1
          };

          const myP = oc.BRep_Tool.PolygonOnTriangulation_1(myEdge, myT, aLocation);
          const edgeNodes = myP.get().Nodes();

          // write vertex buffer
          this_edge.vertex_coord = new Array(edgeNodes.Length() * 3);
          for(let j = 0; j < edgeNodes.Length(); j++) {
            const vertexIndex = edgeNodes.Value(j+1);
            this_edge.vertex_coord[(j * 3) + 0] = this_face.vertex_coord[((vertexIndex-1) * 3) + 0];
            this_edge.vertex_coord[(j * 3) + 1] = this_face.vertex_coord[((vertexIndex-1) * 3) + 1];
            this_edge.vertex_coord[(j * 3) + 2] = this_face.vertex_coord[((vertexIndex-1) * 3) + 2];
          }

          this_edge.edge_index = fullShapeEdgeHashes[edgeHash];
          this_face.edge_indices.push(this_edge.edge_index)

          edgeList.push(this_edge);
        } else {
          fullShapeEdgeHashes2[edgeHash] = edgeHash;
          this_face.edge_indices.push(fullShapeEdgeHashes[edgeHash]);
        }
      });
      facelist.push(this_face);
      triangulations.push(myT);
    });
    // Nullify Triangulations between runs so they're not stored in the cache
    for (let i = 0; i < triangulations.length; i++) { triangulations[i].Nullify(); }

    // Get the free edges that aren't on any triangulated face/surface
    ForEachEdge(oc, shape, (index: number, myEdge: any) => {
      const edgeHash = myEdge.HashCode(100000000);
      if (!fullShapeEdgeHashes2.hasOwnProperty(edgeHash)) {
        const this_edge: any = {
          vertex_coord: [],
          edge_index: -1
        };

        const aLocation = new oc.TopLoc_Location_1();
        const adaptorCurve = new oc.BRepAdaptor_Curve_2(myEdge);
        const tangDef = new oc.GCPnts_TangentialDeflection_2(adaptorCurve, maxDeviation, 0.1, 2, 1.0e-9, 1.0e-7);

        // write vertex buffer
        this_edge.vertex_coord = new Array(tangDef.NbPoints() * 3);
        for(let j = 0; j < tangDef.NbPoints(); j++) {
          const vertex = tangDef.Value(j+1).Transformed(aLocation.Transformation());
          this_edge.vertex_coord[(j * 3) + 0] = vertex.X();
          this_edge.vertex_coord[(j * 3) + 1] = vertex.Y();
          this_edge.vertex_coord[(j * 3) + 2] = vertex.Z();
        }

        this_edge.edge_index = fullShapeEdgeHashes[edgeHash];
        fullShapeEdgeHashes2[edgeHash] = edgeHash;

        edgeList.push(this_edge);
      }
    });

  } catch(err: any) {
    setTimeout(() => {
      err.message = "INTERNAL OPENCASCADE ERROR DURING GENERATE: " + err.message;
      throw err; 
    }, 0);
  }

  return [facelist, edgeList];
}
