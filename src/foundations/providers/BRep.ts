export type V3 = {
  x: number;
  y: number;
  z: number;
};

export interface BRep {
  edges: Array<BRepEdge>;
  faces: Array<BRepFace>;
}


// The parametric equation of the plane is: 
// P(u, v) = O + u*XDir + v*YDir where O, XDir and YDir are respectively the origin, 
// the "X Direction" and the "Y Direction" of the local coordinate system of the plane. 
// The parametric range of the two parameters u and v is ] -infinity, +infinity [.
export interface OCPlane {
  type: string;
  origin: V3;
  xAxis: V3;
  yAxis: V3;
}

// This class defines the infinite cylindrical surface.
// Every cylindrical surface is set by the following equation: S(U,V) = Location + R*cos(U)*XAxis + R*sin(U)*YAxis + V*ZAxis, where R is cylinder radius.
// The local coordinate system of the CylindricalSurface is defined with an axis placement (see class ElementarySurface).
// The "ZAxis" is the symmetry axis of the CylindricalSurface, it gives the direction of increasing parametric value V.
// The parametrization range is : U [0, 2*PI], V ]- infinite, + infinite[
// The "XAxis" and the "YAxis" define the placement plane of the surface (Z = 0, and parametric value V = 0) perpendicular to the symmetry axis. The "XAxis" defines the origin of the parameter U = 0. The trigonometric sense gives the positive orientation for the parameter U.
// When you create a CylindricalSurface the U and V directions of parametrization are such that at each point of the surface the normal is oriented towards the "outside region".
export interface OCCylindricalSurface {
  origin: V3;
  radius: number;
  xAxis: V3;
  yAxis: V3;
  zAxis: V3;
}



export interface BRepFace {
  face_index: number;
  edge_indices: Array<number>;
  normal_coord: Array<number>;
  uv_coord: Array<number>;
  number_of_triangles: number;
  vertex_coord: Array<number>;
  tri_indexes: Array<number>;
  surface: OCPlane | OCCylindricalSurface;
}

export interface BRepEdge {
  edge_index: number;
  vertex_coord: Array<number>;
}

export default BRep;
