export class SASTEngine {
  constructor() {
    // Patterns
    this.SECRET_REGEX = /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][a-zA-Z0-9\-_]{16,}["']/i;
  }

  scan(rootNode, content, filePath) {
    const findings = [];
    const lines = content ? content.split('\n') : [];

    const addFinding = (type, severity, description, node) => {
      const line = node ? node.startPosition.row + 1 : 1;
      const snippet = node ? lines[line - 1] || '' : '';
      findings.push({
        type,
        severity,
        file: filePath,
        lineNumber: line,
        snippet: snippet.trim(),
        description
      });
    };

    const walk = (node) => {
      // 1. eval()
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'identifier' && callee.text === 'eval') {
          addFinding('EVAL_USAGE', 'CRITICAL', 'Usage of eval() is highly discouraged due to security risks.', node);
        }

        // 2. Unsafe dynamic import
        if (callee?.type === 'import') {
          const args = node.children.find(c => c.type === 'arguments');
          if (args && args.namedChildren?.length > 0) {
            const firstArg = args.namedChildren[0];
            if (firstArg.type !== 'string') {
              addFinding('UNSAFE_DYNAMIC_IMPORT', 'HIGH', 'Dynamic import with non-literal argument can lead to path traversal or RCE.', node);
            }
          }
        }

        // 5. localStorage.getItem(token)
        if (callee?.type === 'member_expression') {
          const obj = callee.children[0]?.text;
          const prop = callee.children[2]?.text;
          if (obj === 'localStorage' && prop === 'getItem') {
            const args = node.children.find(c => c.type === 'arguments');
            if (args && args.namedChildren?.length > 0) {
              const firstArg = args.namedChildren[0];
              if (firstArg.type === 'string') {
                const argText = firstArg.text.replace(/['"]/g, '');
                if (['token', 'auth_token', 'access_token'].includes(argText)) {
                  addFinding('LOCALSTORAGE_TOKEN', 'MEDIUM', 'Auth tokens should preferably be stored in HttpOnly cookies, not localStorage.', node);
                }
              }
            }
          }
        }
      }

      // 3. new Function()
      if (node.type === 'new_expression') {
        const callee = node.children?.[1]; // 'new' is child 0, callee is child 1
        if (callee?.type === 'identifier' && callee.text === 'Function') {
          addFinding('FUNCTION_CONSTRUCTOR', 'CRITICAL', 'Usage of new Function() is akin to eval() and poses security risks.', node);
        }
      }

      // 4. dangerouslySetInnerHTML
      if (node.type === 'jsx_attribute') {
        const nameNode = node.children?.[0];
        if (nameNode?.type === 'property_identifier' && nameNode.text === 'dangerouslySetInnerHTML') {
          addFinding('DANGEROUSLY_SET_INNER_HTML', 'HIGH', 'dangerouslySetInnerHTML can lead to XSS vulnerabilities if data is not properly sanitized.', node);
        }
      }

      // 7. Weak Crypto (md5, sha1)
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'member_expression') {
          const prop = callee.children[2]?.text;
          if (prop === 'createHash') {
            const args = node.children.find(c => c.type === 'arguments');
            if (args && args.namedChildren?.length > 0) {
              const firstArg = args.namedChildren[0];
              if (firstArg.type === 'string') {
                const alg = firstArg.text.replace(/['"]/g, '').toLowerCase();
                if (['md5', 'sha1'].includes(alg)) {
                  addFinding('WEAK_CRYPTO', 'HIGH', 'Usage of weak cryptographic algorithms (md5/sha1) is strongly discouraged.', node);
                }
              }
            }
          }
        }
      }

      // 8. Command Injection (exec, spawn)
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        const name = callee?.type === 'identifier' ? callee.text : (callee?.type === 'member_expression' ? callee.children[2]?.text : null);
        if (['exec', 'spawn', 'execSync', 'spawnSync'].includes(name)) {
          const args = node.children.find(c => c.type === 'arguments');
          if (args && args.namedChildren?.length > 0) {
            const firstArg = args.namedChildren[0];
            if (firstArg.type !== 'string') {
              addFinding('COMMAND_INJECTION', 'CRITICAL', 'Command execution with non-literal argument can lead to command injection.', node);
            }
          }
        }
      }

      // 6. Hardcoded Secrets (scan strings and identifiers)
      // We also do a fallback line-based check for secrets to catch things in comments/unparsed areas
      // but only if it's within a valid parsed file. Wait, we can just do line-based scan once per file for secrets.

      // 9. Data Flow tracking per function
      if (['function_declaration', 'arrow_function', 'method_definition'].includes(node.type)) {
        const tracker = new TaintTracker(addFinding);
        tracker.analyzeFunction(node);
      }

      for (const child of node.namedChildren ?? []) {
        walk(child);
      }
    };

    if (rootNode) walk(rootNode);

    // Line-based fallback for hardcoded secrets
    lines.forEach((line, index) => {
      if (this.SECRET_REGEX.test(line)) {
        findings.push({
          type: 'HARDCODED_SECRET',
          severity: 'CRITICAL',
          file: filePath,
          lineNumber: index + 1,
          snippet: line.trim().substring(0, 500),
          description: 'Hardcoded secret or API key found.'
        });
      }
    });

    return findings;
  }
}

class TaintTracker {
  constructor(addFinding) {
    this.addFinding = addFinding;
    this.sources = ['req.body', 'req.query', 'req.params', 'req.headers', 'req.cookies'];
    this.sinks = ['exec', 'eval', 'spawn', 'query', 'queryRaw', 'dangerouslySetInnerHTML', 'readFile', 'writeFile'];
    this.sanitizers = ['parseInt', 'Number', 'escape', 'sanitizeHtml', 'encodeURIComponent'];
  }

  analyzeFunction(fnNode) {
    const taintedVars = new Set();

    const checkRHS = (rhsNode) => {
      if (!rhsNode) return false;
      const text = rhsNode.text;
      
      // Direct source usage
      if (this.sources.some(s => text.startsWith(s))) {
         return true;
      }
      
      // Usage of a tainted variable
      if (rhsNode.type === 'identifier' && taintedVars.has(text)) {
         return true;
      }
      
      // Property access of tainted var
      if (rhsNode.type === 'member_expression') {
         const obj = rhsNode.children[0]?.text;
         if (taintedVars.has(obj)) return true;
      }

      // Check if it's a binary/template string expression containing a tainted var
      if (rhsNode.type === 'binary_expression' || rhsNode.type === 'template_string') {
          for (const child of rhsNode.namedChildren ?? []) {
             if (checkRHS(child)) return true;
          }
      }
      
      return false;
    };

    const walkFn = (node) => {
      if (!node) return;

      // Skip inner functions (they need their own context, or we can just ignore nested scopes for MVP)
      if (node !== fnNode && ['function_declaration', 'arrow_function', 'method_definition'].includes(node.type)) {
         return;
      }

      // 1. Variable declaration: const x = req.body.id
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

      // 2. Assignment: x = req.body.id
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
               taintedVars.delete(idNode.text); // Un-taint if reassigned safe value
            }
         }
      }

      // 3. Sink usage
      if (node.type === 'call_expression') {
         const calleeNode = node.children[0];
         const calleeText = calleeNode?.type === 'member_expression' ? calleeNode.children[2]?.text : calleeNode?.text;
         
         if (this.sinks.includes(calleeText)) {
            const argsNode = node.children.find(c => c.type === 'arguments');
            if (argsNode) {
               for (const arg of argsNode.namedChildren ?? []) {
                  if (checkRHS(arg)) {
                     this.addFinding('DATA_FLOW_TAINT', 'CRITICAL', `Tainted data flows into sensitive sink '${calleeText}' without sanitization.`, node);
                     break; // Report once per call
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
