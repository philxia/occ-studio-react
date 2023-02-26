import React from "react";
import {
  CommandBar,
  ICommandBarItemProps,
} from "@fluentui/react/lib/CommandBar";
import { IButtonProps } from "@fluentui/react/lib/Button";
import { setVirtualParent } from "@fluentui/dom-utilities";
import { BRepProvider } from "./foundations/providers/BRepProvider";
import BRep from "./foundations/providers/BRep";
import { updateModel } from "./reducers";
import { getCode } from "./selectors";
import { useSelector, useDispatch } from "react-redux";

const overflowProps: IButtonProps = { ariaLabel: "More commands" };

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
      
            BRepProvider.evaluate(code).then((breps: BRep[]) => {
              console.log(breps);
              dispatch(updateModel(breps));
            });
          },
        },
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

