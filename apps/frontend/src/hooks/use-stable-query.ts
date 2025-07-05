import { useRef } from "react";
import { useQuery } from "convex/react";

export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args);
  const stored = useRef(result);
  
  // Only update if result is defined AND the _id has changed
  if (result !== undefined && result?._id !== stored.current?._id) {
    stored.current = result;
  }
  
  return stored.current;
}) as typeof useQuery;