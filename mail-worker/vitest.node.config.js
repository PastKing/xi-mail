import { defineConfig } from 'vitest/config';

// 纯函数单测，不需要 workers 运行时
export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/unit/**/*.spec.js']
	}
});
