import { useEffect } from "react";

const SITE_NAME = "DW.ai";

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | ${SITE_NAME}`;

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let created = false;

    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
        created = true;
      }
      const prevDesc = metaDesc.content;
      metaDesc.content = description;

      return () => {
        document.title = prevTitle;
        if (metaDesc) {
          if (created) {
            metaDesc.remove();
          } else {
            metaDesc.content = prevDesc;
          }
        }
      };
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description]);
}
