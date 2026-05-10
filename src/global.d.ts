interface Window {
  FlutterwaveCheckout: (config: any) => void;
  ethereum?: any;
}

interface ImportMetaEnv {
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY: string;
  readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
