import { AudioEngine } from "./audio.js";
import { Backdrop } from "./bg.js";
import { FX } from "./fx.js";

window.SocraticDopa = { AudioEngine, Backdrop, FX };
window.dispatchEvent(new CustomEvent("socratic-rush-dopa-ready"));
