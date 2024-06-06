import { useEffect } from "react";
import { useRouter } from "next/navigation";

const useInterceptBackNavigation = (onBackNavigation: any) => {
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (event: any) => {
      event.preventDefault();
      event.returnValue = ""; // Required for Chrome
      onBackNavigation();
    };

    const handlePopState = (event: any) => {
      onBackNavigation();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onBackNavigation, router]);
};

export default useInterceptBackNavigation;
