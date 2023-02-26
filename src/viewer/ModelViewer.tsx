import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import withBRepProvider from "../containers/withBRepProvider";
import { getElements } from "../selectors";
import { useSelector } from "react-redux";
import BRep from "../foundations/providers/BRep";
import { BufferAttribute, BufferGeometry, Vector2, Vector3 } from "three";
import { GizmoHelper, GizmoViewport, Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";

function Box(props: any) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef();
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (ref.current.rotation.x += delta));
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

export function ModelViewer() {
  const elements = useSelector(getElements);

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[500, -500, 500]} />
      <OrbitControls />
      <ambientLight />
      <Grid infiniteGrid={true} />
      <GizmoHelper
        alignment="bottom-right" // widget alignment within scene
        margin={[80, 80]} // widget margins (X, Y) 
        >
        <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="black" />
      </GizmoHelper>
      <pointLight position={[500, -500, 500]} />
      {/* <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} /> */}
      {elements.map((brep: BRep, index: number) => {
        return (
          <group key={index}>
            {brep.faces.map((face: any) => {
              if (!face || !Array.isArray(face.vertex_coord)) {
                return null;
              }
              const geometry = new BufferGeometry();
              const vertices: Vector3[] = [];
              const uvs: Vector2[] = [];
              const verticesInFloatArray: number[] = [];
              // const uvsInFloatArray: number[] = [];

              // const bounds = face.surface.bounds;
              // const uBound = bounds.u0.current;
              // const vBound = bounds.v0.current;
              // Sort Vertices into three.js Vector3 List
              for (let i = 0; i < face.vertex_coord.length; i += 3) {
                vertices.push(
                  new Vector3(
                    face.vertex_coord[i],
                    face.vertex_coord[i + 1],
                    face.vertex_coord[i + 2]
                  )
                );
              }
              for (let i = 0; i < face.uv_coord.length; i += 2) {
                uvs.push(new Vector2(face.uv_coord[i], face.uv_coord[i + 1]));
              }
              // Sort Triangles into a js Face List
              for (let i = 0; i < face.tri_indexes.length; i += 3) {
                const v1 = vertices[face.tri_indexes[i]];
                const v2 = vertices[face.tri_indexes[i + 1]];
                const v3 = vertices[face.tri_indexes[i + 2]];
                verticesInFloatArray.push(
                  v1.x,
                  v1.y,
                  v1.z,
                  v2.x,
                  v2.y,
                  v2.z,
                  v3.x,
                  v3.y,
                  v3.z
                );
                const uv1 = uvs[face.tri_indexes[i]];
                const uv2 = uvs[face.tri_indexes[i + 1]];
                const uv3 = uvs[face.tri_indexes[i + 2]];
                // uvsInFloatArray.push(
                //   Math.abs(uv1.x - uBound),
                //   Math.abs(uv1.y - vBound),
                //   Math.abs(uv2.x - uBound),
                //   Math.abs(uv2.y - vBound),
                //   Math.abs(uv3.x - uBound),
                //   Math.abs(uv3.y - vBound)
                // );
              }
              geometry.setAttribute(
                "position",
                new BufferAttribute(new Float32Array(verticesInFloatArray), 3)
              );
              // geometry.setAttribute(
              //   "uv",
              //   new BufferAttribute(new Float32Array(uvsInFloatArray), 2)
              // );
              geometry.computeVertexNormals();
              // only enable the fill pattern when the face is perpendicular to the driven curve.
              // const faceNormal = new Vector3()
              //   .crossVectors(
              //     new Vector3(
              //       face.surface.xAxis.x,
              //       face.surface.xAxis.y,
              //       face.surface.xAxis.z
              //     ),
              //     new Vector3(
              //       face.surface.yAxis.x,
              //       face.surface.yAxis.y,
              //       face.surface.yAxis.z
              //     )
              //   )
              //   .normalize();
              return (
                <mesh
                  key={`face:${face.face_index}`}
                  name={`face:${face.face_index}`}
                  geometry={geometry}
                >
                  <meshBasicMaterial attach="material" color={0xffffff} />
                </mesh>
              );
            })}
            {brep.edges.map((edge) => {
              let lineVertices: Vector3[] = [];
              for (let i = 0; i < edge.vertex_coord.length - 3; i += 3) {
                lineVertices.push(
                  new Vector3(
                    edge.vertex_coord[i],
                    edge.vertex_coord[i + 1],
                    edge.vertex_coord[i + 2]
                  )
                );

                lineVertices.push(
                  new Vector3(
                    edge.vertex_coord[i + 3],
                    edge.vertex_coord[i + 1 + 3],
                    edge.vertex_coord[i + 2 + 3]
                  )
                );
              }
              const lineGeometry = new BufferGeometry().setFromPoints(
                lineVertices
              );
              return (
                <mesh
                  key={`edge:${edge.edge_index}`}
                  name={`edge:${edge.edge_index}`}
                >
                  <lineSegments geometry={lineGeometry}>
                    <lineBasicMaterial color={"black"} linewidth={1} />
                  </lineSegments>
                </mesh>
              );
            })}
          </group>
        );
      })}
    </Canvas>
  );
}

export default withBRepProvider(ModelViewer);
