export interface SourcePolicyViolation {
  rule: string;
  message: string;
}

const FORBIDDEN_PATTERNS: Array<{ rule: string; expression: RegExp; message: string }> = [
  { rule: 'module-import', expression: /\b(?:import|export|require)\b/, message: 'Controller source must be a self-contained JavaScript factory.' },
  { rule: 'network', expression: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/, message: 'Network APIs are not allowed.' },
  { rule: 'host-access', expression: /\b(?:process|globalThis|window|document|navigator|localStorage|sessionStorage)\b/, message: 'Host APIs are not allowed.' },
  { rule: 'nondeterminism', expression: /\b(?:Date|performance|setTimeout|setInterval|requestAnimationFrame)\b|Math\.random\s*\(/, message: 'Wall-clock, timers, and random APIs are not allowed.' },
  { rule: 'dynamic-code', expression: /\b(?:eval|Function)\s*\(/, message: 'Dynamic code execution is not allowed inside a controller.' },
];

export function validateControllerSource(source: string): SourcePolicyViolation[] {
  const violations = FORBIDDEN_PATTERNS
    .filter(({ expression }) => expression.test(source))
    .map(({ rule, message }) => ({ rule, message }));

  if (!/\b(?:function\s+createController|(?:const|let|var)\s+createController\s*=)/.test(source)) {
    violations.push({ rule: 'factory', message: 'Source must define createController().' });
  }

  return violations;
}
