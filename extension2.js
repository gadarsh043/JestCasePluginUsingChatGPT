const vscode = require('vscode');
const { window } = require('vscode');
const config = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');
// config()
const path = require('path');
const md = require('markdown-it')();

const morph = require('./morph.js')
const wordArray = ['Blibli', 'PeopleHum', 'Engati'];

async function activate(context) {
    console.log('Extension2 is running')
    let userInputOpenAiApikey = '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'
    // while (!userInputOpenAiApikey || !userInputOpenAiApikey.match(/^sk-[a-zA-Z0-9]{22,50}$/)) {
    //     userInputOpenAiApikey = await vscode.window.showInputBox({
    //         prompt: 'Enter your OpenAI API key. You can find it at [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)',
    //         value: userInputOpenAiApikey,
    //         markdown: true
    //     })
    
    //     if (userInputOpenAiApikey && !userInputOpenAiApikey.match(/^sk-[a-zA-Z0-9]{22,50}$/)) {
    //         userInputOpenAiApikey = undefined
    //         vscode.window.showInformationMessage('Error in OpenAI API key.', { modal: true })
    //     }
    // }
    console.log(userInputOpenAiApikey);
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
    if (!isValidLanguage(languageUsed)) {
      vscode.window.showInformationMessage('Please Run this on Java / Vue / Java script files');
      return;
    }

    const functionsMatch = findFunctionsInText(editor.document.getText(), languageUsed);
    if (!functionsMatch.length) {
      vscode.window.showInformationMessage('No functions found');
      return;
    }

    const functionNames = createFunctionList(functionsMatch);

	// ChatGPT Initializing
	const configuration = new Configuration({
		apiKey: userInputOpenAiApikey,
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

      // Function to higlight the selected code
      highlightFunction(editor, selection.label);

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
      if (suggestion.length === 0) {
        return;
      }

      // Call OpenAI code here and then let user get the test case.
      vscode.window.showInformationMessage('Will be right back with the result.');
	    await triggerOpenApiCall(selection, suggestion, languageUsed, openai, context)
      vscode.window.showInformationMessage('Hope this helps.');
    });

  });

  let explainTheFunction = vscode.commands.registerCommand('write-jest-code.explainFunctions', async function () {
    const editor = vscode.window.activeTextEditor;
    const doc = editor.document;
    const languageUsed = doc.languageId;

	// ChatGPT Initializing
	const configuration = new Configuration({
		apiKey: userInputOpenAiApikey,
	});
	const openai = new OpenAIApi(configuration);

		// Get the selected text of the active editor
		const selection = vscode.window.activeTextEditor.selection;
		const selectedText = {
            label: vscode.window.activeTextEditor.document.getText(selection)
        }

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
    if (suggestion.length === 0) {
      return;
    }

    // Call OpenAI code here and then let user get the test case.
    vscode.window.showInformationMessage('Will be right back with the result.');
    await triggerOpenApiCall(selectedText, suggestion,languageUsed, openai, context)
    vscode.window.showInformationMessage('Hope this helps.');

  });

  context.subscriptions.push(disposable, explainTheFunction);
}

function isValidLanguage(languageUsed) {
  return languageUsed === 'vue' || languageUsed === 'javascript' || languageUsed === 'java';
}

function findFunctionsInText(text, languageUsed) {
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

  return functionsMatch;
}

function createFunctionList(functionsMatch) {
  return functionsMatch.map(match => {
    return {
      label: match,
      kind: vscode.SymbolKind.Function,
      detail: 'Function'
    };
  });
}

function highlightFunction(editor, functionName) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
    color: 'white',
    fontWeight: 'normal'
  });
  const selectedFunctionRange = new vscode.Range(
      editor.document.positionAt(editor.document.getText().indexOf(functionName)),
      editor.document.positionAt(editor.document.getText().indexOf(functionName) + functionName.length)
  );
  const ranges = [selectedFunctionRange];
  editor.setDecorations(decorationType, ranges);  
  // Remove decoration after 3 seconds
  setTimeout(() => {
    editor.setDecorations(decorationType, []);
  }, 3000);
}

async function triggerOpenApiCall (selection, suggestion,languageUsed, openai, context) {
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
    prompt = morph.replaceWithUnique(prompt, wordArray)
    // console.log('Morphed Text')
    // console.log(prompt)
    let res
    try {
      res = await openai.createChatCompletion({
          model:"gpt-3.5-turbo",
          messages:[{role: "user", content: prompt}]
      })
    } catch (error) {
      if (error.response.status === 401) {
        vscode.window.showInformationMessage('UnAuthorised API Token Key.', { modal: true });
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    }
    let solution = res.data.choices[0].message.content;
    // console.log('UnMorphed Text')
    // console.log(solution)
// Need to fix height when length is too big
    // vscode.window.showInformationMessage(solution, { modal: true }); 

// New Way for Showing
if (solution !== undefined) {
    solution = morph.replaceWithWords(solution)
  const panel = vscode.window.createWebviewPanel(
    'solutionPanel',
    'Solution',
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
exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
