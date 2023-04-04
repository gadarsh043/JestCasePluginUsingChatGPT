const vscode = require('vscode');
const { window } = require('vscode');
const config = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');
// config()

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
    if (doc.languageId !== 'vue' && doc.languageId !== 'javascript') {
      vscode.window.showInformationMessage('This command is only available for Vue and JavaScript files');
      return;
    }

    // A regular expression is used to match function declarations in the text.
    // The matched function names are added to an array 'functionsMatch'.
    const text = doc.getText();

    // Below line finds all the functions
    // const regex = /(function|const|let|var)\s+([\w]+)\s*(?=\()|(?:([\w]+)\s*()?\s*=>)|(?<=\.)([\w]+)\s*(?=\()/g;

    // Need only functions which we can write text case
    const regex = /^\s*\w+\s*\(\s*\)\s*{\s*(?!\/\/).*[\s\S]*?}/gm;
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
      // Call OpenAI code here and then let user get the test case.
      vscode.window.showInformationMessage('Will be right back with the answer.');
	    await triggerOpenApiCall(selection)
    });

	async function triggerOpenApiCall (selection) {
		// OpenAi Initial Prompt here
		let prompt = 'Give the full jest mock test case that covers the complete function\'s flow where consider the external function call as no-op\'s.'
		prompt = prompt + '\n' + selection.label
		const res = await openai.createChatCompletion({
			model:"gpt-3.5-turbo",
			messages:[{role: "user", content: prompt}]
		})
		const solution = res.data.choices[0].message.content;
		vscode.window.showInformationMessage(solution, { modal: true });

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
