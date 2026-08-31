export const DEFAULT_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

/**
 * 收信验证码提取用的文本模型。只放当前目录里仍可用、且不太会拖垮 Email Worker 时限的型号。
 * 目录：https://developers.cloudflare.com/workers-ai/models/
 */
export const AI_CODE_MODELS = [
	{ id: '@cf/meta/llama-3.1-8b-instruct-fast', name: 'Llama 3.1 8B Fast', tag: 'recommend' },
	{ id: '@cf/meta/llama-3.2-1b-instruct', name: 'Llama 3.2 1B', tag: 'lowCost' },
	{ id: '@cf/meta/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', tag: 'lowCost' },
	{ id: '@cf/meta/llama-3.1-8b-instruct-fp8', name: 'Llama 3.1 8B FP8', tag: '' },
	{ id: '@cf/qwen/qwen3-30b-a3b-fp8', name: 'Qwen3 30B-A3B', tag: 'zh' },
	{ id: '@cf/openai/gpt-oss-20b', name: 'GPT-OSS 20B', tag: 'strong' },
	{ id: '@cf/google/gemma-4-26b-a4b-it', name: 'Gemma 4 26B', tag: 'strong' },
	{ id: '@cf/mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small 3.1 24B', tag: 'strong' }
];

export function resolveAiModel(id, envFallback) {
	const allowed = new Set(AI_CODE_MODELS.map(item => item.id));
	if (id && allowed.has(id)) return id;
	if (envFallback && allowed.has(envFallback)) return envFallback;
	return DEFAULT_AI_MODEL;
}
