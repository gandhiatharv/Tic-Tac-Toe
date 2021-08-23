let gameOver = false;
let symbol = "";
let gameID = "";
let isEnemiesTurn = false;
let playAgainAcceptedCounter = 0;

window.addEventListener("load", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyAYGi02IDN0pj8j6WpyCu9zPlMMNldFbEk",
    authDomain: "tictactoe-b5f38.firebaseapp.com",
    databaseURL: "https://tictactoe-b5f38.firebaseio.com",
    projectId: "tictactoe-b5f38",
    storageBucket: "tictactoe-b5f38.appspot.com",
    messagingSenderId: "1067628874201",
    appId: "1:1067628874201:web:eb678a8a3f3e01761231c8",
    measurementId: "G-7GNWN8HBJ5"
  };

  firebase.initializeApp(firebaseConfig);

  const playAgainBtn = document.getElementById("playAgainBtn");
  const signUpBtn = document.getElementById("signUpBtn");
  const signupScreen = document.getElementById("signupScreen");
  const gameScreen = document.getElementById("gameScreen");
  const playersToChallenge = document.getElementById("playersToChallenge");
  const quitGameRequest = document.getElementById("quitGameRequest");
  const signOutBtn = document.getElementById("signOutBtn");
  const disableWindow = document.getElementById("disableWindow");
  const disableReqWindow = document.getElementById("disableRequestWindow");
  const usernameField = document.getElementById("usernameField");

  buildGrid();
  addEventListenersToCells();
  sessionStorage.setItem("symbol", "cross");
  symbol = sessionStorage.getItem("symbol");

  playAgainBtn.addEventListener("click", playAgainButton);
  signUpBtn.addEventListener("click", login);
  quitGameRequest.addEventListener("click", openQuitWindow);
  disableWindow.addEventListener("click", disableQuitWindow);
  disableReqWindow.addEventListener("click", disableRequestWindow);
  signOutBtn.addEventListener("click", () => {
    firebase.auth().signOut();

    displayUserFeedback("signed out successfully!", "white", 3, "#353535");
    document.getElementById("usernameInput").classList.remove("errorInput");
  });

  window.addEventListener("keydown", ev => {
    if (ev.key === "Enter" && !signupScreen.className.includes("hide")) {
      login();
    }
  });

  firebase
    .database()
    .ref("games/waitingPlayers")
    .on("value", snapshot => {
      while (playersToChallenge.firstChild) {
        playersToChallenge.removeChild(playersToChallenge.firstChild);
      }

      if (snapshot.val() !== null) {
        for (const index in snapshot.val()) {
          if (
            snapshot.val()[index].username !==
            sessionStorage.getItem("username")
          ) {
            playersToChallenge.appendChild(
              createWaitingPlayer(snapshot.val()[index])
            );
          }
        }
      }

      if (playersToChallenge.childNodes.length === 0) {
        document.getElementById("challengeText").textContent =
          "No players are waiting for a game.";
      } else {
        document.getElementById("challengeText").textContent =
          "Challenge a waiting player.";
      }
    });

  firebase.auth().onAuthStateChanged(user => {
    if (user !== null && sessionStorage.getItem("username") !== null) {
      // insert userdata (username & uid) into the waiting players list
      firebase
        .database()
        .ref("games/waitingPlayers/" + user.uid)
        .set({
          username: sessionStorage.getItem("username"),
          uid: user.uid
        });

      sessionStorage.setItem("uid", user.uid);

      // listen if a game request was sent to me
      firebase
        .database()
        .ref("games/waitingPlayers/" + user.uid + "/gameRequest")
        .on("value", snapshot => {
          if (snapshot.val() !== null) {
            const requestWindow = document.getElementById("requestWindow");
            const requestText = document.getElementById("requestText");
            const acceptRequest = document.getElementById("acceptRequest");
            const declineRequest = document.getElementById("declineRequest");
            const disableWindow = document.getElementById(
              "disableRequestWindow"
            );
            const request = [];

            for (const index in snapshot.val()) {
              request.push(snapshot.val()[index]);
            }

            firebase
              .database()
              .ref("games/waitingPlayers/" + request[0])
              .once("value")
              .then(snapshot2 => {
                requestText.textContent = `${
                  snapshot2.val().username
                } wants to play with you!`;
                requestWindow.classList.remove("hide");
                disableWindow.classList.remove("hide");
                sessionStorage.setItem(
                  "usernameEnemy",
                  snapshot2.val().username
                );
                sessionStorage.setItem("uidEnemy", snapshot2.val().uid);

                setTimeout(() => {
                  requestWindow.style.opacity = 1;
                  requestWindow.style.transform = "scale(1)";
                  disableWindow.style.opacity = 1;
                }, 10);
              });

            declineRequest.addEventListener("click", () => {
              requestWindow.style.opacity = 0;
              disableWindow.style.opacity = 0;
              requestWindow.style.transform = "scale(.6)";

              setTimeout(() => {
                requestWindow.classList.add("hide");
                disableWindow.classList.add("hide");
              }, 300);

              firebase
                .database()
                .ref("games/waitingPlayers/" + user.uid + "/gameRequest")
                .remove();
              firebase
                .database()
                .ref("games/waitingPlayers/" + user.uid + "/newGame")
                .remove();
            });

            acceptRequest.addEventListener("click", () => {
              gameID = new Date().getTime();

              firebase
                .database()
                .ref("games/playing/" + gameID)
                .set({
                  player1: {
                    username: sessionStorage.getItem("username"),
                    symbol: "cross",
                    uid: firebase.auth().currentUser.uid
                  },
                  player2: {
                    username: sessionStorage.getItem("usernameEnemy"),
                    symbol: "circle",
                    uid: sessionStorage.getItem("uidEnemy")
                  },
                  nextTurn: { isPlayer1: true, clickedCell: -1 }
                });

              firebase
                .database()
                .ref(
                  `games/waitingPlayers/${sessionStorage.getItem("uidEnemy")}`
                )
                .update({
                  newGame: { hasStarted: true, gameID: gameID }
                });

              addEventListenerForChangesAtTheGrid();
              quitListener();
              initResultText();

              signupScreen.classList.add("hide");
              gameScreen.classList.remove("hide");

              declineRequest.click();

              firebase
                .database()
                .ref("games/waitingPlayers/" + user.uid)
                .remove();
              firebase
                .database()
                .ref(
                  `games/waitingPlayers/${sessionStorage.getItem("uidEnemy")}`
                )
                .remove();

              sessionStorage.setItem("symbol", "cross");
              symbol = sessionStorage.getItem("symbol");
            });
          }
        });

      // when game starts will this code be executed (for the player who sent a game request)
      firebase
        .database()
        .ref("games/waitingPlayers/" + user.uid + "/newGame")
        .on("value", snapshot => {
          if (snapshot.val() !== null) {
            if (snapshot.val()["hasStarted"]) {
              sessionStorage.setItem("symbol", "circle");
              symbol = sessionStorage.getItem("symbol");
              gameID = snapshot.val()["gameID"];
              signupScreen.classList.add("hide");
              gameScreen.classList.remove("hide");

              firebase
                .database()
                .ref(`games/playing/${gameID}/player1`)
                .once("value")
                .then(snapshot2 => {
                  sessionStorage.setItem(
                    "usernameEnemy",
                    snapshot2.val()["username"]
                  );
                  sessionStorage.setItem("uidEnemy", snapshot2.val()["uid"]);
                  initResultText();
                });

              addEventListenerForChangesAtTheGrid();
              quitListener();
            }
          }
        });

      playAgainBtn.isClicked = false;
      signupScreen.classList.add("hide");
      signupScreen.classList.remove("hide");
      playersToChallenge.classList.remove("disable");

      // add every player css class
      for (const player of document
        .getElementById("playersToChallenge")
        .getElementsByTagName("div")) {
        player.classList.add("playerHover");
      }

      // display username on screen
      usernameField.textContent = `username: ${sessionStorage.getItem(
        "username"
      )}`;

      // set value of username input to the current username
      document.getElementById("usernameInput").value = sessionStorage.getItem(
        "username"
      );

      // disable signup button
      signUpBtn.classList.add("disable");
    } else {
      // delete userdata from waiting players list
      firebase
        .database()
        .ref(`games/waitingPlayers/${sessionStorage.getItem("uid")}`)
        .remove()
        .then(() => {
          sessionStorage.removeItem("uid");
        });

      // change classLists of elements
      signupScreen.classList.add("hide");
      playersToChallenge.classList.add("disable");
      signupScreen.classList.remove("hide");

      // remove all items from sessionStorage
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("drawnSymbol");
      sessionStorage.removeItem("usernameEnemy");
      sessionStorage.removeItem("uidEnemy");
      sessionStorage.removeItem("symbol");

      for (const player of document
        .getElementById("playersToChallenge")
        .getElementsByTagName("div")) {
        player.classList.remove("playerHover");
      }

      // reset username field
      usernameField.innerHTML = "&nbsp;";

      // enable signup button
      signUpBtn.classList.remove("disable");
    }
  });

  if (sessionStorage.getItem("username") === null) {
    if (firebase.auth().currentUser !== null) {
      firebase.auth().currentUser.signOut();
    }
  }
});

function login() {
  if (!document.getElementById("signUpBtn").className.includes("disable")) {
    const username = document.getElementById("usernameInput");

    if (username.value === "" || username.value === " ") {
      username.classList.add("errorInput");
    } else {
      if (firebase.auth().currentUser !== null) {
        firebase
          .database()
          .ref(`games/waitingPlayers/${firebase.auth().currentUser.uid}`)
          .remove()
          .then(() => {
            firebase.auth().signInAnonymously();
          });
      } else {
        firebase.auth().signInAnonymously();
      }

      username.classList.remove("errorInput");
      sessionStorage.setItem("username", username.value);
    }
  }
}

function buildGrid() {
  const wrapper = document.getElementById("gameWindow");
  let row = document.createElement("div");

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");

    cell.setAttribute("id", `cell${i + 1}`);
    cell.setAttribute("class", `cell`);
    row.appendChild(cell);

    if ((i + 1) % 3 === 0) {
      row.classList.add("row");
      wrapper.appendChild(row);
      row = document.createElement("div");
    }
  }
}

function addEventListenersToCells() {
  const resultText = document.getElementById("resultText");
  let nextSymbol = "cross";
  let saveDataIsAllowed = false;

  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`cell${i + 1}`);

    cell.addEventListener("click", () => {
      if (!gameOver) {
        if (!cell.isUsed) {
          let currSymbol;

          if (isEnemiesTurn) {
            if (sessionStorage.getItem("drawnSymbol") === "cross") {
              drawCross(cell);
              currSymbol = "cross";
              nextSymbol = "circle";
              resultText.textContent = "it's your turn";
            } else if (sessionStorage.getItem("drawnSymbol") === "circle") {
              drawCircle(cell);
              currSymbol = "circle";
              nextSymbol = "cross";
              resultText.textContent = "it's your turn";
            }

            saveDataIsAllowed = true;
          } else {
            if (nextSymbol === symbol) {
              if (symbol === "cross") {
                drawCross(cell);
                currSymbol = "cross";
                nextSymbol = "circle";
              } else {
                drawCircle(cell);
                currSymbol = "circle";
                nextSymbol = "cross";
              }

              resultText.textContent = `it's ${formatNameCorrectly(
                sessionStorage.getItem("usernameEnemy")
              )} turn`;

              saveDataIsAllowed = true;
            }
          }

          if (saveDataIsAllowed) {
            cell.isUsed = true;
            cell.symbol = currSymbol;

            firebase
              .database()
              .ref(`games/playing/${gameID}/nextTurn`)
              .set({
                clickedCell: i + 1,
                isPlayer1Turn: !isEnemiesTurn,
                drawnSymbol: currSymbol
              });

            let areThreeInARow = checkThreeInOneRow(currSymbol);

            if (areThreeInARow[0]) {
              gameOver = true;
              resultText.innerHTML = "&nbsp;";
              showWinner(currSymbol);
              setTimeout(() => {
                delightLosingRows(areThreeInARow);
              }, 500);
            }

            setTimeout(() => {
              if (checkIfGameIsDraw() && !gameOver) {
                resultText.innerHTML = "&nbsp;";
                showWinner("draw");
                gameOver = true;
              }
            }, 550);
          }

          saveDataIsAllowed = false;
        } else {
          // Field is already used
        }
      }
    });
  }
}

function drawCircle(cell) {
  const circle = document.createElement("div");
  const circleRight = document.createElement("div");
  const circleLeft = document.createElement("div");
  const wholeCircleRight = document.createElement("div");
  const wholeCircleLeft = document.createElement("div");

  circle.setAttribute("class", "circle");
  circleRight.setAttribute("class", "circleWrapper circleWrapperRight");
  circleLeft.setAttribute("class", "circleWrapper circleWrapperLeft");
  wholeCircleRight.setAttribute("class", "wholeCircle circleRight");
  wholeCircleLeft.setAttribute("class", "wholeCircle circleLeft");

  circleRight.appendChild(wholeCircleRight);
  circleLeft.appendChild(wholeCircleLeft);
  circle.appendChild(circleRight);
  circle.appendChild(circleLeft);
  cell.appendChild(circle);
}

function drawCross(cell) {
  const lineWrapper = document.createElement("div");
  const line1 = document.createElement("div");
  const line2 = document.createElement("div");
  const animation = "line 250ms ease-in-out 300ms forwards";

  lineWrapper.classList.add("cross");
  line1.classList.add("line1");
  line2.classList.add("line2");

  lineWrapper.appendChild(line1);
  lineWrapper.appendChild(line2);
  cell.appendChild(lineWrapper);

  line1.style.animation = animation;
  line2.style.animation = animation;
}

function getCellIndizesOfOneSymbol(symbol) {
  let result = "";

  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`cell${i + 1}`);

    if (cell.symbol === symbol) {
      result += (i + 1).toString();
    }
  }

  return result;
}

function checkThreeInOneRow(symbol) {
  const winningPosibilities = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["1", "4", "7"],
    ["2", "5", "8"],
    ["3", "6", "9"],
    ["1", "5", "9"],
    ["3", "5", "7"]
  ];

  const cellIndizes = getCellIndizesOfOneSymbol(symbol);
  let contains = false;
  let winningOrder = [];

  for (const posibility of winningPosibilities) {
    if (
      cellIndizes.includes(posibility[0]) &&
      cellIndizes.includes(posibility[1]) &&
      cellIndizes.includes(posibility[2])
    ) {
      contains = true;
      winningOrder = posibility;
    }
  }

  return [contains, winningOrder];
}

function playAgainButton() {
  const button = document.getElementById("playAgainBtn");

  if (!button.isClicked) {
    button.isClicked = true;

    firebase
      .database()
      .ref(`games/playing/${gameID}/playAgain`)
      .update({
        counter: playAgainAcceptedCounter + 1
      });
  }
}

function playAgain() {
  const resultText = document.getElementById("resultText");
  const gameWindow = document.getElementById("gameWindow");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const buttonText = document.getElementById("playerAcceptedRematchText");

  if (document.getElementById('winningScreen').className.includes('hide')) {
    firebase
      .database()
      .ref(`games/playing/${gameID}/nextTurn`)
      .set({
        clickedCell: -1,
        isPlayer1Turn: true
      });

    firebase
      .database()
      .ref(`games/playing/${gameID}/playAgain`)
      .set({
        counter: 0
      });

    while (gameWindow.firstChild) {
      gameWindow.removeChild(gameWindow.firstChild);
    }

    const symbolWrapper = document.getElementById("symbolWrapper");

    while (symbolWrapper.firstChild)
      symbolWrapper.removeChild(symbolWrapper.firstChild);

    buildGrid();
    addEventListenersToCells();
    initResultText();

    playAgainBtn.isClicked = false;
    isEnemiesTurn = false;
    gameOver = false;
    buttonText.textContent = "0/2";
    symbol = sessionStorage.getItem("symbol");
  }
}

function back() {
  document.getElementById("startScreen").classList.toggle("hide");
  document.getElementById("localScreen").classList.toggle("hide");
}

function checkIfGameIsDraw() {
  let isDraw = true;

  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`cell${i + 1}`);

    if (!cell.isUsed) {
      isDraw = false;
    }
  }

  return isDraw;
}

function delightLosingRows(data) {
  for (let i = 0; i < 9; i++) {
    if (i + 1 != data[1][0] && i + 1 != data[1][1] && i + 1 != data[1][2]) {
      if (document.getElementById(`cell${i + 1}`).childNodes[0] !== undefined) {
        document
          .getElementById(`cell${i + 1}`)
          .childNodes[0].classList.add("lowlight");
      }
    }
  }
}

function createWaitingPlayer(playerData) {
  const player = document.createElement("div");
  const name = document.createElement("p");

  name.textContent = playerData.username;

  player.addEventListener("click", () => {
    if (firebase.auth().currentUser !== null) {
      firebase
        .database()
        .ref("games/waitingPlayers/" + playerData.uid + "/gameRequest")
        .set({
          uid: firebase.auth().currentUser.uid
        });

      displayUserFeedback(
        `a game request was sent to ${playerData.username}.`,
        "white",
        2.5,
        "#353535"
      );
    }
  });

  firebase.auth().currentUser !== null
    ? player.classList.add("playerHover")
    : () => {};
  player.classList.add("player");
  player.appendChild(name);

  return player;
}

function addEventListenerForChangesAtTheGrid() {
  firebase
    .database()
    .ref(`games/playing/${gameID}`)
    .on("value", snapshot => {
      const data = snapshot.val();

      if (data !== null && data["nextTurn"] !== undefined) {
        if (data["nextTurn"].clickedCell > 0) {
          isEnemiesTurn = data["nextTurn"].isPlayer1Turn;
          sessionStorage.setItem("drawnSymbol", data["nextTurn"].drawnSymbol);
          document
            .getElementById(`cell${data["nextTurn"].clickedCell}`)
            .click();
        }
      }
    });

  firebase
    .database()
    .ref(`games/playing/${gameID}/playAgain`)
    .on("value", snapshot => {
      if (snapshot.val() !== null) {
        playAgainAcceptedCounter = snapshot.val()["counter"];
        playerAcceptedRematchText.textContent = `${playAgainAcceptedCounter}/2`;
        playAgainAcceptedCounter === 2 ? playAgain() : () => {};
      }
    });
}

function openQuitWindow() {
  const quitWindow = document.getElementById("quitWindow");
  const quitGame = document.getElementById("quitGame");
  const cancelQuitGame = document.getElementById("cancelQuitGame");
  const disableWindow = document.getElementById("disableWindow");

  if (document.getElementById('winningScreen').className.includes('hide')) {
    quitWindow.classList.remove("hide");
    disableWindow.classList.remove("hide");
  
    setTimeout(() => {
      quitWindow.style.opacity = 1;
      quitWindow.style.transform = "scale(1)";
      disableWindow.style.opacity = 1;
    }, 10);
  
    quitGame.addEventListener("click", () => {
      firebase
        .database()
        .ref(`games/playing/${gameID}/quit`)
        .update({
          quit: true,
          username: sessionStorage.getItem("username")
        });
  
      disableWindow.classList.add("hide");
      disableWindow.style.opacity = 0;
      const symbolWrapper = document.getElementById("symbolWrapper");

      while (symbolWrapper.firstChild)
        symbolWrapper.removeChild(symbolWrapper.firstChild);
    });
  
    cancelQuitGame.addEventListener("click", () => {
      quitWindow.style.opacity = 0;
      quitWindow.style.transform = "scale(.6)";
      disableWindow.style.opacity = 0;
  
      setTimeout(() => {
        quitWindow.classList.add("hide");
        disableWindow.classList.add("hide");
      }, 260);
    });
  }
}

function quitListener() {
  const resultText = document.getElementById("resultText");
  const gameWindow = document.getElementById("gameWindow");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const buttonText = document.getElementById("playerAcceptedRematchText");

  firebase
    .database()
    .ref(`games/playing/${gameID}/quit`)
    .on("value", snapshot => {
      if (snapshot.val() !== null) {
        if (snapshot.val()["quit"]) {
          firebase
            .database()
            .ref(`games/waitingPlayers/${firebase.auth().currentUser.uid}`)
            .set({
              username: sessionStorage.getItem("username"),
              uid: firebase.auth().currentUser.uid
            });

          firebase
            .database()
            .ref(`games/playing/${gameID}`)
            .remove()
            .then(() => {
              gameID = "";
            });

          symbol = "";
          gameScreen.classList.add("hide");
          signupScreen.classList.remove("hide");

          const quitWindow = document.getElementById("quitWindow");
          quitWindow.style.opacity = 0;
          quitWindow.style.transform = "scale(.6)";

          setTimeout(() => {
            quitWindow.classList.add("hide");
          }, 260);

          while (gameWindow.firstChild) {
            gameWindow.removeChild(gameWindow.firstChild);
          }

          buildGrid();
          addEventListenersToCells();

          if (
            snapshot.val()["username"] !== sessionStorage.getItem("username")
          ) {
            displayUserFeedback(
              `${sessionStorage.getItem("usernameEnemy")} has left the game`,
              "white",
              4.5,
              "#353535"
            );
          }

          playAgainBtn.isClicked = false;
          isEnemiesTurn = false;
          gameOver = false;
          buttonText.textContent = "0/2";
          resultText.textContent = "it's your turn";

          const symbolWrapper = document.getElementById("symbolWrapper");

          while (symbolWrapper.firstChild)
            symbolWrapper.removeChild(symbolWrapper.firstChild);
        }
      }
    });
}

function formatNameCorrectly(name) {
  if (name !== null) {
    if (name.toLowerCase().charAt(name.length - 1) === "s") {
      return `${name}'`;
    } else {
      return `${name}'s`;
    }
  } else {
    return false;
  }
}

function initResultText() {
  if (symbol === "cross") {
    resultText.textContent = "it's your turn";
  } else {
    resultText.textContent = `it's ${formatNameCorrectly(
      sessionStorage.getItem("usernameEnemy")
    )} turn`;
  }
}

function disableQuitWindow() {
  const cancelQuitGame = document.getElementById("cancelQuitGame");

  cancelQuitGame.click();
}

function disableRequestWindow() {
  const declineRequest = document.getElementById("declineRequest");

  declineRequest.click();
}

function displayUserFeedback(text, color, duration, background) {
  const feedbackText = document.getElementById("feedbackText");

  background = background || "transparent";

  feedbackText.textContent = text;
  feedbackText.style.color = color;
  feedbackText.style.backgroundColor = background;

  feedbackText.classList.remove("hide");

  setTimeout(() => {
    feedbackText.style.opacity = 1;
    feedbackText.style.transform = "scale(1)";
  }, 10);

  setTimeout(() => {
    feedbackText.style.opacity = 0;
    feedbackText.style.transform = "scale(1.2)";

    setTimeout(() => {
      feedbackText.classList.add("hide");
    }, 120);
  }, duration * 1000);
}

function showWinner(winner) {
  const winningScreen = document.getElementById("winningScreen");
  const symbolWrapper = document.getElementById("symbolWrapper");
  const winningText = document.getElementById("winningText");
  const wrapperList = [
    document.getElementById("gameWindow"),
    document.getElementById("buttonBar"),
    document.getElementById("resultBar")
  ];

  if (winner === "cross" || winner === "draw") {
    drawCross(symbolWrapper);
  }

  if (winner === "circle" || winner === "draw") {
    drawCircle(symbolWrapper);
  }

  if (symbolWrapper.childNodes.length === 1) {
    winningText.textContent = "has won!";
  } else if (symbolWrapper.childNodes.length > 1) {
    winningText.textContent = "draw!";
  }

  setTimeout(() => {
    for (const wrapper of wrapperList) {
      wrapper.classList.add("fadeOut");
    }

    winningScreen.classList.remove("hide");

    setTimeout(() => {
      winningScreen.classList.add("fadeIn");
    }, 10);

    window.addEventListener("click", () => {
      if (!winningScreen.className.includes("hide")) {
        winningScreen.classList.remove("fadeIn");

        setTimeout(() => {
          // resetGame();

          for (const wrapper of wrapperList) {
            wrapper.classList.remove("fadeOut");
          }

          winningScreen.classList.add("hide");
        }, 260);
      }
    });
  }, 2000);
}
