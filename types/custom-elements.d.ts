import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sm-globe": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
