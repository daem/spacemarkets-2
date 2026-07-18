"use client";

import { useEffect } from "react";

/* Renders the <sm-globe> custom element and registers its definition on the
   client. The element upgrades in place once the module loads. */
export default function Globe(props: { style?: React.CSSProperties }) {
  useEffect(() => {
    import("./sm-globe.js");
  }, []);
  return <sm-globe style={props.style} />;
}
