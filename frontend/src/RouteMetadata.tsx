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
  title: "Lucent | AI Clinical Trial Prediction Platform",
  description:
    "An open-source Clinical Intelligence Platform. Lucent fuses MedBERT, BioSimCSE, and all-MiniLM embeddings to forecast trial Probability of Success (PoS) with calibrated uncertainty estimation.",
  canonical: "https://lucent.kariadourian.com/",
  openGraphTitle: "Lucent | Clinical Trial Intelligence",
  openGraphDescription:
    "An open-source Clinical Intelligence Platform. Lucent fuses MedBERT, BioSimCSE, and all-MiniLM embeddings to forecast trial Probability of Success (PoS) with calibrated uncertainty estimation.",
  openGraphUrl: "https://lucent.kariadourian.com/",
};

const aboutMetadata: PageMetadata = {
  title: "About Lucent | Clinical Trial Intelligence",
  description:
    "Learn how Lucent combines biomedical language models, multimodal feature engineering, attention-based fusion, and calibrated uncertainty to forecast clinical trial outcomes.",
  canonical: "https://lucent.kariadourian.com/about",
  openGraphTitle: "About Lucent | Clinical Trial Intelligence",
  openGraphDescription:
    "Learn how Lucent combines biomedical language models, multimodal feature engineering, attention-based fusion, and calibrated uncertainty to forecast clinical trial outcomes.",
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
