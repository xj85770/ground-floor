export type ModelExample = {
  name: string;
  size: number;
  modality: string;
  license: string;
  source: string;
};

export const modelExamples: ModelExample[] = [
  { name:'Gemma 3 4B IT', size:4, modality:'Text + image', license:'Gemma terms', source:'https://huggingface.co/google/gemma-3-4b-it' },
  { name:'Qwen3 8B', size:8, modality:'Text · thinking switch', license:'Apache 2.0', source:'https://huggingface.co/Qwen/Qwen3-8B' },
  { name:'Qwen3 14B', size:14, modality:'Text · thinking switch', license:'Apache 2.0', source:'https://huggingface.co/Qwen/Qwen3-14B' },
  { name:'Gemma 3 27B IT', size:27, modality:'Text + image', license:'Gemma terms', source:'https://huggingface.co/google/gemma-3-27b-it' },
  { name:'Qwen3 32B', size:32, modality:'Text · thinking switch', license:'Apache 2.0', source:'https://huggingface.co/Qwen/Qwen3-32B' },
  { name:'Llama 3.3 70B Instruct', size:70, modality:'Multilingual text', license:'Llama 3.3 license', source:'https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct' },
];

export const runtimes = [
  { name:'MLX / MLX-LM', fit:'Apple-native framework path', note:'For people comfortable with Python and model artifacts.', source:'https://github.com/ml-explore/mlx-lm' },
  { name:'llama.cpp', fit:'Portable GGUF path', note:'Direct control over quantization, context, and Metal settings.', source:'https://github.com/ggml-org/llama.cpp' },
  { name:'LM Studio', fit:'Packaged desktop path', note:'A graphical way to evaluate local models; inspect app and network settings.', source:'https://www.lmstudio.ai/docs/app/system-requirements' },
];

export function memoryTier(gb: number) {
  if (gb < 12) return { max:4, range:'3–4B class at Q4', detail:'Keep context modest and close memory-heavy applications.' };
  if (gb < 22) return { max:9, range:'7–9B class at Q4', detail:'A practical small-model range; long context reduces headroom.' };
  if (gb < 30) return { max:14, range:'Up to 14B class at Q4', detail:'A mid-size range with room for a moderate working context.' };
  if (gb < 36) return { max:20, range:'Up to roughly 20B class at Q4', detail:'More room than 24 GB, but exact artifact overhead still matters.' };
  if (gb < 48) return { max:27, range:'Up to 27B class at Q4', detail:'A larger range; verify the exact artifact and context directly.' };
  if (gb < 64) return { max:32, range:'Up to 32B class at Q4', detail:'Large mid-size artifacts are plausible with controlled context.' };
  if (gb < 96) return { max:40, range:'Up to roughly 40B class at Q4', detail:'Substantial room, but this cautious range does not promise 70B fit or speed.' };
  return { max:70, range:'Up to 70B class at Q4', detail:'70B-class Q4 artifacts are plausible; speed and useful context still require measurement.' };
}

export const memoryOptions = [8,16,18,24,32,36,48,64,96,128,192];
