var counter = 0;
var nameMap = {};

function replaceWithUnique(str, wordArray) {
  wordArray.forEach(function(word) {
    var pattern = new RegExp(word, 'gi');
    var uniqueName = generateUniqueName();
    nameMap[uniqueName] = word;
    str = str.replace(pattern, uniqueName);
  });
  return str;
}

function replaceWithWords(str) {
  Object.keys(nameMap).forEach(function(key) {
    var pattern = new RegExp(key, 'g');
    str = str.replace(pattern, nameMap[key]);
  });
  return str;
}

function generateUniqueName() {
  counter++;
  return 'replacement' + counter;
}

// var str = 'I use SellergoogleJob and Microsoft to log into Facebook.';
// var wordArray = ['Google', 'Microsoft', 'Facebook'];
// var newStr = replaceWithUnique(str, wordArray);
// console.log(newStr); // "I use replacement-1 and replacement-2 to log into replacement-3."

// var finalStr = replaceWithWords(newStr);
// console.log(finalStr); // "I use Google and Microsoft to log into Facebook."
module.exports = {replaceWithUnique, replaceWithWords}