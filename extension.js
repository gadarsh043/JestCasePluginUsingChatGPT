const vscode = require('vscode');
const { window } = require('vscode');
const config = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');
// config()
const path = require('path');
const md = require('markdown-it')();

function activate(context) {
  let disposable = vscode.commands.registerCommand('write-jest-code.listFunctions', function () {

    // If there is no active editor, an information message is displayed and the function returns.
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    // Document object is obtained from the editor, 
    // and if the language ID is not 'vue' or 'javascript',
    // an information message is displayed and the function returns.
    const doc = editor.document;
    const languageUsed = doc.languageId;
    if (!(languageUsed === 'vue' || languageUsed === 'javascript' || languageUsed === 'java')) {
      vscode.window.showInformationMessage('Please Run this on Java / Vue / Java script files');
      return;
    }

    // A regular expression is used to match function declarations in the text.
    // The matched function names are added to an array 'functionsMatch'.
    const text = doc.getText();
    // Below line finds all the functions
    // const regex = /(function|const|let|var)\s+([\w]+)\s*(?=\()|(?:([\w]+)\s*()?\s*=>)|(?<=\.)([\w]+)\s*(?=\()/g;
    // Need only functions which we can write text case
    const regex = 
    languageUsed === 'java' ?
    /(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:<[\w,?\s]+>\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\}/gm : 
    /^\s*\w+\s*\(\s*\)\s*{\s*((?:[^{}]*|\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\})*)\s*}/gm;

    const functionsMatch = [];
    let match;
    while ((match = regex.exec(text))) {
      const [funcName1, funcName2, , funcName3] = match;
      if (funcName1) {
        functionsMatch.push(funcName1);
      } else if (funcName2) {
        functionsMatch.push(funcName2);
      } else if (funcName3) {
        functionsMatch.push(funcName3);
      }
    }
    // If no functions are found, an information message is displayed and the function returns.
    if (!functionsMatch.length) {
      vscode.window.showInformationMessage('No functions found');
      return;
    }

    // The function names in 'functionsMatch' are transformed into an array of objects with properties 'label', 'kind', and 'detail'. 
    // This array is passed to 'vscode.window.showQuickPick', which displays a selection box containing the function names.
    const functionNames = functionsMatch.map(match => {
      return {
        label: match,
        kind: vscode.SymbolKind.Function,
        detail: 'Function'
      };
    });

	// ChatGPT Initializing
	const configuration = new Configuration({
		apiKey: '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',
	});
	const openai = new OpenAIApi(configuration);

    // When the user selects a function from the selection box, its position in the document is obtained using 'doc.getText().indexOf(selection.label)'.
    // A 'Selection' object is created with this position and used to set the editor's selection and reveal the selected range.
    vscode.window.showQuickPick(functionNames).then(async selection => {
      if (!selection) {
        return;
      }
      const range = doc.getText().indexOf(selection.label);
      const position = doc.positionAt(range);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(editor.selection);

      // Highlighting the selected code
      // Get the selected function name from the quick pick dialog
      const selectedFunctionName = selection.label;
      // Create a TextEditorDecorationType for the highlighting
      const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
        color: 'white',
        fontWeight: 'normal'
      });
      // Create a range that covers the selected function name
      const selectedFunctionRange = new vscode.Range(
          editor.document.positionAt(text.indexOf(selectedFunctionName)),
          editor.document.positionAt(text.indexOf(selectedFunctionName) + selectedFunctionName.length)
      );
      // Add the range to a list of ranges to decorate
      const ranges = [selectedFunctionRange];
      // Apply the decoration to the editor
      editor.setDecorations(decorationType, ranges);  
      

      // Options to choose from.
      let Options = []
      languageUsed === 'java' ? Options = ['Generate Unit Test Cases', 'Edge Case Analysis', 'Explain code','Generate Java Doc'] : Options = ['Generate Unit Test Cases', 'Edge Case Analysis', 'Explain code']
      let suggestion = ''
      await vscode.window.showQuickPick(Options).then(option => {
        if (!option) {
          return;
        }
        suggestion = option
      })

      // Call OpenAI code here and then let user get the test case.
      vscode.window.showInformationMessage('Will be right back with the result.');
	    await triggerOpenApiCall(selection, suggestion)
      vscode.window.showInformationMessage('Hope this helps.');
    });

	async function triggerOpenApiCall (selection, suggestion) {
		// OpenAi Initial Prompt here
		let prompt = ''
    switch (suggestion) {
      case 'Generate Unit Test Cases': 
        prompt = 
        languageUsed === 'java' ?
        'Generate JUnit Test cases for the below code from Spring boot framework. Consider edge cases such as null inputs or empty collections, as well as boundary cases such as the upper and lower limits of any input parameters. Additionally, consider testing any dependencies that the class relies on, and whether the class properly handles any exceptions that may be thrown during its execution. Finally, consider testing the class\'s interaction with any external resources such as databases, web services, or message queues. Ignore verifying log statements.':
        'Give the full jest mock test case that covers the complete function\'s flow where consider the external function call as no-op\'s.'
        break
      case 'Edge Case Analysis': 
        prompt = 'List all possible edge cases which could break the method as table with the columns, line of code which has potential error, error level, probability of occurence, updated code where the scenario is fixed'
        break
      case 'Explain code': 
        prompt = 'Give a brief description on the below method, Explain it to me as if I have never interacted with this code base'
        break
      case 'Generate Java Doc': 
        prompt = languageUsed === 'java' ?'Generate JavaDoc for below method. Dont include code, Just return Java Doc comment in response':
        'generate comment to indicate what this function does (A javadoc equivalent of javascript)'
        break
      default: prompt = ''
    }
		prompt = prompt + '\n' + selection.label
		const res = await openai.createChatCompletion({
			model:"gpt-3.5-turbo",
			messages:[{role: "user", content: prompt}]
		})
		const solution = res.data.choices[0].message.content;
    // Need to fix height when length is too big
		// vscode.window.showInformationMessage(solution, { modal: true }); 

    // New Way for Showing
    if (solution !== undefined) {
      const panel = vscode.window.createWebviewPanel(
        'solutionPanel',
        'Solution.md',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
        }
      );
      // Read the contents of the MD file and convert it to HTML
      const html = md.render(solution);

      // Set the HTML content of the panel
      panel.webview.html = html;
    } else {
      console.log('Error: empty response from OpenAI');
    }
	}

  });

  context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
