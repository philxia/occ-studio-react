import React from "react";
import {
  CommandBar,
  ICommandBarItemProps,
} from "@fluentui/react/lib/CommandBar";
import { IButtonProps } from "@fluentui/react/lib/Button";
import { BRepProvider } from "./foundations/providers/BRepProvider";
import BRep from "./foundations/providers/BRep";
import { updateCode, updateModel, updateParameters } from "./reducers";
import { getCode } from "./selectors";
import { useSelector, useDispatch } from "react-redux";

const overflowProps: IButtonProps = { ariaLabel: "More commands" };


const sourceCodes = [`const stairWidth1 = NewMeasurableParameter('Stair width', 100, 80, 200).value;
const treadDepth = NewMeasurableParameter('Tread depth', 10, 10, 20).value;
const riserHeight = NewMeasurableParameter('Riser height', 10, 10, 20).value;
const run1Steps = NewMeasurableParameter('Run steps', 10, 10, 20).value;;
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
const stepsLeftSideFace = NewPolygon(stepsLeftSideFacePoints, false);
const stairRun1 = NewExtrude(stepsLeftSideFace, [stairWidth1, 0, 0]);
`,
`// 1. roof profile
const roofWidth = NewMeasurableParameter('Roof width', 400, 400, 1200).value; 
const roofsDistance = NewMeasurableParameter('Roofs distance', 300, 300, 800).value;
const roofHeight = NewMeasurableParameter('Roof height', 150, 100, 500).value;
const roofThickness = NewMeasurableParameter('Roof thickness', 10, 5, 20).value;
const hasSubRoof = NewBooleanParameter('Has sub-roof', false).value;
const subRoofHeight = NewMeasurableParameter('Sub-roof height', 100, 50, 300, hasSubRoof).value;
const subRoofsDistance = NewMeasurableParameter('Sub-roofs distance', 100, 80, 200, hasSubRoof).value;
const distanceToSubRoof = (roofsDistance/2)*(1-subRoofHeight/roofHeight);
const subRoofWidth = NewMeasurableParameter('Sub-roofs width', 100, 80, 200, hasSubRoof).value;
const subRoofCenterOffset = NewMeasurableParameter('Sub-roof center offset', 0, -100, 100, hasSubRoof).value;

const roofProfile1Points = [];
if (hasSubRoof) {
  roofProfile1Points.push(
    [-roofWidth/2, 0, roofHeight],
    [roofWidth/2, 0, roofHeight],
    [roofWidth/2, roofsDistance/2, 0],
    [subRoofCenterOffset+subRoofsDistance/2, roofsDistance/2, 0],
    [subRoofCenterOffset, distanceToSubRoof, subRoofHeight],
    [subRoofCenterOffset-subRoofsDistance/2, roofsDistance/2, 0],
    [-roofWidth/2, roofsDistance/2, 0],
  );
} else {
  roofProfile1Points.push(
    [-roofWidth/2, 0, roofHeight],
    [roofWidth/2, 0, roofHeight],
    [roofWidth/2, roofsDistance/2, 0],
    [-roofWidth/2, roofsDistance/2, 0],
  );
}

const roofProfile1Face = NewPolygon(roofProfile1Points, false);
const roofProfile1Solid = NewExtrude(roofProfile1Face, [0,0,roofThickness]);

const roofProfile2Points = [];
roofProfile2Points.push(
  [roofWidth/2, 0, roofHeight],
  [-roofWidth/2, 0, roofHeight],
  [-roofWidth/2, -roofsDistance/2, 0],
  [roofWidth/2, -roofsDistance/2, 0],
);
const roofProfile2Face = NewPolygon(roofProfile2Points, false);
const roofProfile2Solid = NewExtrude(roofProfile2Face, [0,0,roofThickness]);
const mainRoof = NewUnion([roofProfile1Solid, roofProfile2Solid]);

if (hasSubRoof) {
  const subRoofProfile1Points = [];
  subRoofProfile1Points.push(
    [subRoofCenterOffset, distanceToSubRoof, subRoofHeight],
    [subRoofCenterOffset+subRoofsDistance/2, roofsDistance/2, 0],
    [subRoofCenterOffset+subRoofsDistance/2, roofsDistance/2 + subRoofWidth, 0],
    [subRoofCenterOffset, roofsDistance/2 + subRoofWidth, subRoofHeight],
  );
  const subRoofProfile1Face = NewPolygon(subRoofProfile1Points, false);
  const subRoofProfile1Solid = NewExtrude(subRoofProfile1Face, [0,0,roofThickness]); 

  const subRoofProfile2Points = [];
  subRoofProfile2Points.push(
    [subRoofCenterOffset, distanceToSubRoof, subRoofHeight],
    [subRoofCenterOffset, roofsDistance/2 + subRoofWidth, subRoofHeight],
    [subRoofCenterOffset-subRoofsDistance/2, roofsDistance/2 + subRoofWidth, 0],
    [subRoofCenterOffset-subRoofsDistance/2, roofsDistance/2, 0],
  );
  const subRoofProfile2Face = NewPolygon(subRoofProfile2Points, false);
  const subRoofProfile2Solid = NewExtrude(subRoofProfile2Face, [0,0,roofThickness]); 
}`];

export const CommandBarBasicExample: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const code: string = useSelector(getCode);

  return (
    <CommandBar
      items={[
        {
          key: "play",
          text: "Play",
          cacheKey: "myCacheKey", // changing this key will invalidate this item's cache
          iconProps: { iconName: "Play" },
          onClick: (
            ev?:
              | React.MouseEvent<HTMLElement, MouseEvent>
              | React.KeyboardEvent<HTMLElement>
              | undefined
          ) => {
            ev?.persist();
            if (!code || code.length < 5 || !BRepProvider.promiseWorker) {
              alert('Not ready');
              return;
            }
      
            BRepProvider.evaluate({code, parameters: []}).then((result: {breps: BRep[]; parameters: []}) => {
              // console.log(breps);
              dispatch(updateModel(result.breps));
              dispatch(updateParameters(result.parameters));
            });
          },
        },
        {
          key: 'upload',
          text: 'Upload',
          iconProps: { iconName: 'Upload' },
          subMenuProps: {
            items: [
              {
                key: 'uploadfile',
                text: 'File',
                preferMenuTargetAsEventTarget: true,
                onClick: (ev?: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement> | undefined) => {
                  ev?.persist();
                }
              },
              {
                key: 'sampleFile1',
                text: 'sample - stair',
                preferMenuTargetAsEventTarget: true,
                onClick: (ev?: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement> | undefined) => {
                  ev?.persist();
                  dispatch(updateCode(sourceCodes[0]));
                },
              },
              {
                key: 'sampleFile2',
                text: 'sample - roof',
                preferMenuTargetAsEventTarget: true,
                onClick: (ev?: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement> | undefined) => {
                  ev?.persist();
                  dispatch(updateCode(sourceCodes[1]));
                },
              },
            ]
          },
        }
      ]}
      overflowItems={[]}
      overflowButtonProps={overflowProps}
      farItems={_farItems}
      ariaLabel="Inbox actions"
      primaryGroupAriaLabel="Email actions"
      farItemsGroupAriaLabel="More actions"
    />
  );
};

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

export function Nav() {
  return (<CommandBarBasicExample />);
}

