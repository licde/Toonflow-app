/**
 * Toonflow AI供应商模板 — ComfyUI controllable still backend (optional).
 * Registered for discovery; runtime generation uses comfyStillActuator.
 * Saving `baseUrl` bridges into process.env.COMFY_URL (Desktop default http://127.0.0.1:8000).
 * @version 1.0
 */
type VideoMode =
  | "text"
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}
interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
}
interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}
interface AudioModel {
  name: string;
  modelName: string;
  type: "audio";
}

vendor = {
  name: "ComfyUI",
  version: "1.0",
  inputs: [
    { name: "baseUrl", type: "url", tip: "ComfyUI Desktop API base e.g. http://127.0.0.1:8000" },
  ],
  inputValues: {
    get baseUrl() {
      return this._baseUrl ?? "http://127.0.0.1:8000";
    },
    set baseUrl(v: string) {
      this._baseUrl = v;
    },
    _baseUrl: "http://127.0.0.1:8000",
  },
  models: [
    {
      name: "Comfy Contact SoftEnv",
      modelName: "comfy-contact-softenv",
      type: "image",
      mode: ["multiReference", "singleImage", "text"],
    } satisfies ImageModel,
  ] as (TextModel | ImageModel | VideoModel | AudioModel)[],
  text: async () => {
    throw new Error("ComfyUI vendor text not used — use still actuator");
  },
  image: async () => {
    throw new Error("ComfyUI vendor image entry — use runComfyContactSoftEnv actuator");
  },
  video: async () => {
    throw new Error("ComfyUI vendor video not supported");
  },
  audio: async () => {
    throw new Error("ComfyUI vendor audio not supported");
  },
};
