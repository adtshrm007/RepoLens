import { SecurityRule } from './SecurityRule.js';

export class DataFlowTaintRule extends SecurityRule {
  constructor() {
    super(
      'DATA_FLOW_TAINT',
      'CRITICAL',
      'Tainted data flows into a sensitive sink without sanitization.',
      20 // CWE-20: Improper Input Validation
    );
    this.sources = ['req.body', 'req.query', 'req.params', 'req.headers', 'req.cookies'];
    this.sinks = ['exec', 'eval', 'spawn', 'query', 'queryRaw', 'dangerouslySetInnerHTML', 'readFile', 'writeFile'];
    this.sanitizers = ['parseInt', 'Number', 'escape', 'sanitizeHtml', 'encodeURIComponent'];
  }

  getRecommendation() {
    return 'Validate and sanitize all user input before passing it to sensitive sinks. Use type checking or safe abstractions.';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      if (['function_declaration', 'arrow_function', 'method_definition'].includes(node.type)) {
        this.analyzeFunction(node, filePath, lines, findings);
      }
      for (const child of node.namedChildren ?? []) {
        walk(child);
      }
    };

    if (rootNode) walk(rootNode);
    return findings;
  }

  analyzeFunction(fnNode, filePath, lines, findings) {
    const taintedVars = new Set();

    const checkRHS = (rhsNode) => {
      if (!rhsNode) return false;
      const text = rhsNode.text;
      
      if (this.sources.some(s => text.startsWith(s))) {
         return true;
      }
      
      if (rhsNode.type === 'identifier' && taintedVars.has(text)) {
         return true;
      }
      
      if (rhsNode.type === 'member_expression') {
         const obj = rhsNode.children[0]?.text;
         if (taintedVars.has(obj)) return true;
      }

      if (rhsNode.type === 'binary_expression' || rhsNode.type === 'template_string') {
          for (const child of rhsNode.namedChildren ?? []) {
             if (checkRHS(child)) return true;
          }
      }
      
      return false;
    };

    const walkFn = (node) => {
      if (!node) return;

      if (node !== fnNode && ['function_declaration', 'arrow_function', 'method_definition'].includes(node.type)) {
         return;
      }

      if (node.type === 'variable_declarator') {
         const idNode = node.children.find(c => c.type === 'identifier');
         const initNode = node.children.find(c => c.type !== 'identifier' && c.text !== '=');
         
         if (idNode && initNode) {
            let isSanitized = false;
            if (initNode.type === 'call_expression') {
               const callee = initNode.children[0]?.text;
               if (this.sanitizers.includes(callee)) {
                  isSanitized = true;
               }
            }

            if (!isSanitized && checkRHS(initNode)) {
               taintedVars.add(idNode.text);
            }
         }
      }

      if (node.type === 'assignment_expression') {
         const idNode = node.children[0];
         const rhsNode = node.children[2];
         
         if (idNode?.type === 'identifier') {
            let isSanitized = false;
            if (rhsNode.type === 'call_expression') {
               const callee = rhsNode.children[0]?.text;
               if (this.sanitizers.includes(callee)) {
                  isSanitized = true;
               }
            }
            if (!isSanitized && checkRHS(rhsNode)) {
               taintedVars.add(idNode.text);
            } else {
               taintedVars.delete(idNode.text);
            }
         }
      }

      if (node.type === 'call_expression') {
         const calleeNode = node.children[0];
         const calleeText = calleeNode?.type === 'member_expression' ? calleeNode.children[2]?.text : calleeNode?.text;
         
         if (this.sinks.includes(calleeText)) {
            const argsNode = node.children.find(c => c.type === 'arguments');
            if (argsNode) {
               for (const arg of argsNode.namedChildren ?? []) {
                  if (checkRHS(arg)) {
                     findings.push(this.createFinding(filePath, node, lines, `Tainted data flows into sensitive sink '${calleeText}' without sanitization.`));
                     break;
                  }
               }
            }
         }
      }

      for (const child of node.namedChildren ?? []) {
         walkFn(child);
      }
    };

    walkFn(fnNode);
  }
}
