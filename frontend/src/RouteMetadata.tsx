import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type PageMetadata = {
  title: string;
  description: string;
  canonical: string;
  openGraphTitle: string;
  openGraphDescription: string;
  openGraphUrl: string;
};

const homeMetadata: PageMetadata = {
  title: "Lucent | Clinical Trial Prediction",
  description:
    "Lucent retrieves ClinicalTrials.gov records and estimates the probability of a favorable trial outcome, with MC-dropout dispersion.",
  canonical: "https://lucent.kariadourian.com/",
  openGraphTitle: "Lucent | Clinical Trial Prediction",
  openGraphDescription:
    "A clinical trial outcome model with explicit MC-dropout variability and source-aligned technical context.",
  openGraphUrl: "https://lucent.kariadourian.com/",
};

const aboutMetadata: PageMetadata = {
  title: "Lucent Model Note | Data, Architecture, and Limitations",
  description:
    "Technical documentation for Lucent's trial-outcome target, registry inputs, neural architecture, MC-dropout estimation, limitations, and freshness.",
  canonical: "https://lucent.kariadourian.com/about",
  openGraphTitle: "Lucent Model Note",
  openGraphDescription:
    "Target definition, data, architecture, uncertainty methodology, and limitations for Lucent.",
  openGraphUrl: "https://lucent.kariadourian.com/about",
};

function setMetaContent(selector: string, content: string) {
  const element = document.head.querySelector<HTMLMetaElement>(selector);

  if (element) {
    element.content = content;
  }
}

function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = pathname === "/about" ? aboutMetadata : homeMetadata;
    const canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );

    document.title = metadata.title;
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:title"]', metadata.openGraphTitle);
    setMetaContent(
      'meta[property="og:description"]',
      metadata.openGraphDescription,
    );
    setMetaContent('meta[property="og:url"]', metadata.openGraphUrl);

    if (canonical) {
      canonical.href = metadata.canonical;
    }
  }, [pathname]);

  return null;
}

export default RouteMetadata;
