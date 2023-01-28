import React, { useRef, useState } from "react";
import {
  CommandBar,
  ICommandBarItemProps,
} from "@fluentui/react/lib/CommandBar";
import { IButtonProps } from "@fluentui/react/lib/Button";
import { setVirtualParent } from "@fluentui/dom-utilities";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { Canvas, useFrame } from "@react-three/fiber";
import "./App.css";

const overflowProps: IButtonProps = { ariaLabel: "More commands" };

export const CommandBarBasicExample: React.FunctionComponent = () => {
  return (
    <CommandBar
      items={_items}
      overflowItems={_overflowItems}
      overflowButtonProps={overflowProps}
      farItems={_farItems}
      ariaLabel="Inbox actions"
      primaryGroupAriaLabel="Email actions"
      farItemsGroupAriaLabel="More actions"
    />
  );
};

const _items: ICommandBarItemProps[] = [
  {
    key: "newItem",
    text: "New",
    cacheKey: "myCacheKey", // changing this key will invalidate this item's cache
    iconProps: { iconName: "Add" },
    subMenuProps: {
      items: [
        {
          key: "emailMessage",
          text: "Email message",
          iconProps: { iconName: "Mail" },
          ["data-automation-id"]: "newEmailButton", // optional
        },
        {
          key: "calendarEvent",
          text: "Calendar event",
          iconProps: { iconName: "Calendar" },
        },
      ],
    },
  },
  {
    key: "upload",
    text: "Upload",
    iconProps: { iconName: "Upload" },
    subMenuProps: {
      items: [
        {
          key: "uploadfile",
          text: "File",
          preferMenuTargetAsEventTarget: true,
          onClick: (
            ev?:
              | React.MouseEvent<HTMLElement, MouseEvent>
              | React.KeyboardEvent<HTMLElement>
              | undefined
          ) => {
            ev?.persist();

            Promise.resolve().then(() => {
              const inputElement = document.createElement("input");
              inputElement.style.visibility = "hidden";
              inputElement.setAttribute("type", "file");

              document.body.appendChild(inputElement);

              const target = ev?.target as HTMLElement | undefined;

              if (target) {
                setVirtualParent(inputElement, target);
              }

              inputElement.click();

              if (target) {
                setVirtualParent(inputElement, null);
              }

              setTimeout(() => {
                inputElement.remove();
              }, 10000);
            });
          },
        },
        {
          key: "uploadfolder",
          text: "Folder",
          preferMenuTargetAsEventTarget: true,
          onClick: (
            ev?:
              | React.MouseEvent<HTMLElement, MouseEvent>
              | React.KeyboardEvent<HTMLElement>
              | undefined
          ) => {
            ev?.persist();

            Promise.resolve().then(() => {
              const inputElement = document.createElement("input");
              inputElement.style.visibility = "hidden";
              inputElement.setAttribute("type", "file");

              (inputElement as { webkitdirectory?: boolean }).webkitdirectory =
                true;

              document.body.appendChild(inputElement);

              const target = ev?.target as HTMLElement | undefined;

              if (target) {
                setVirtualParent(inputElement, target);
              }

              inputElement.click();

              if (target) {
                setVirtualParent(inputElement, null);
              }

              setTimeout(() => {
                inputElement.remove();
              }, 10000);
            });
          },
        },
      ],
    },
  },
  {
    key: "share",
    text: "Share",
    iconProps: { iconName: "Share" },
    onClick: () => console.log("Share"),
  },
  {
    key: "download",
    text: "Download",
    iconProps: { iconName: "Download" },
    onClick: () => console.log("Download"),
  },
];

const _overflowItems: ICommandBarItemProps[] = [
  {
    key: "move",
    text: "Move to...",
    onClick: () => console.log("Move to"),
    iconProps: { iconName: "MoveToFolder" },
  },
  {
    key: "copy",
    text: "Copy to...",
    onClick: () => console.log("Copy to"),
    iconProps: { iconName: "Copy" },
  },
  {
    key: "rename",
    text: "Rename...",
    onClick: () => console.log("Rename"),
    iconProps: { iconName: "Edit" },
  },
];

const _farItems: ICommandBarItemProps[] = [
  {
    key: "tile",
    text: "Grid view",
    // This needs an ariaLabel since it's icon-only
    ariaLabel: "Grid view",
    iconOnly: true,
    iconProps: { iconName: "Tiles" },
    onClick: () => console.log("Tiles"),
  },
  {
    key: "info",
    text: "Info",
    // This needs an ariaLabel since it's icon-only
    ariaLabel: "Info",
    iconOnly: true,
    iconProps: { iconName: "Info" },
    onClick: () => console.log("Info"),
  },
];

function Box(props) {
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

export function App() {
  const editorRef = useRef(null);

  function handleEditorDidMount(editor: null, monaco: any) {
    editorRef.current = editor;
  }

  function showValue() {
    alert(editorRef.current?.getValue());
  }
  return (
    <div className="App">
      <CommandBarBasicExample />
      <div className="flex-container">
        <div className="flex-child magenta">
          <Editor
            height="90vh"
            defaultLanguage="javascript"
            defaultValue="// some comment"
            onMount={handleEditorDidMount}
          />{" "}
        </div>
        <div className="flex-child green">
          <Canvas>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Box position={[-1.2, 0, 0]} />
            <Box position={[1.2, 0, 0]} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
