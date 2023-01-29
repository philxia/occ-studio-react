import { Spinner, SpinnerSize } from "@fluentui/react";
import React, { Component } from "react";
import { BRepProvider } from "../foundations/providers/BRepProvider";

export const BRepContext = React.createContext(null);

export const withBRepProvider = (Wrapped: any) => {
  const HOC = (props: any) => {
    class WithBRepProvider extends Component {
      state = {
        BRepProvider: null,
      };

      componentDidMount() {
        const bRepProvider = new BRepProvider();
        BRepProvider.messageHandlers["startupCallback"] = () => {
          this.setState({
            BRepProvider: bRepProvider,
          });
        };
      }

      render() {
        const { BRepProvider } = this.state;
        if (!BRepProvider) {
          return <Spinner label="Loading OpenCascade Library..." size={SpinnerSize.large}/>;
        }
        return (
          <>
            <BRepContext.Provider value={BRepProvider}>
              <Wrapped {...props} />
            </BRepContext.Provider>
          </>
        );
      }
    }
    return <WithBRepProvider {...props} />;
  };
  return HOC;
};

export default withBRepProvider;
