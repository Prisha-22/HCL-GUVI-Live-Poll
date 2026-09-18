import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useEffect, useState } from "react";

const API_URL = "https://hcl-guvi-live-poll.onrender.com";

/* =========================
   LOGIN / REGISTER
========================= */

function Login() {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const submit = async () => {
    setError("");
    setMessage("");

    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "/register" : "/login";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      if (isRegister) {
        setMessage("Account created successfully! You can now login.");
        setIsRegister(false);
        setPassword("");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);

        navigate("/");
      }
    } catch (error) {
      setError("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container login-container">

        <div className="login-logo">
          <div className="brand-icon">⚡</div>
          <h1>LivePoll</h1>
          <p className="subtitle">
            Create interactive polls and watch results update live.
          </p>
        </div>

        <div className="card">

          <h2>
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          <p className="section-subtitle">
            {isRegister
              ? "Create an account to start creating polls."
              : "Login to manage your polls and view live results."}
          </p>

          <label>Username</label>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submit();
              }
            }}
          />

          {error && <p className="error">{error}</p>}

          {message && <p className="success">{message}</p>}

          <button
            className="create-button"
            onClick={submit}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "Create Account"
              : "Login"}
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setMessage("");
            }}
          >
            {isRegister
              ? "Already have an account? Login"
              : "Create a new account"}
          </button>

        </div>
      </div>
    </div>
  );
}

/* =========================
   HOME / DASHBOARD
========================= */

function Home() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [createdPoll, setCreatedPoll] = useState(null);

  const [myPolls, setMyPolls] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollsLoading, setPollsLoading] = useState(true);

  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  /* =========================
     LOAD MY POLLS
  ========================= */

  useEffect(() => {
    const loadMyPolls = async () => {
      try {
        const response = await fetch(`${API_URL}/polls/mine`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            logout();
          }

          return;
        }

        setMyPolls(data);
      } catch (error) {
        console.log("Could not load polls");
      } finally {
        setPollsLoading(false);
      }
    };

    if (token) {
      loadMyPolls();
    }
  }, [token]);

  /* =========================
     OPTION HANDLING
  ========================= */

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];

    newOptions[index] = value;

    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length >= 10) {
      setError("You can add a maximum of 10 options.");
      return;
    }

    setOptions([...options, ""]);
  };

  /* =========================
     LOGOUT
  ========================= */

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    navigate("/login");
  };

  /* =========================
     CREATE POLL
  ========================= */

  const createPoll = async () => {
    setError("");

    const cleanQuestion = question.trim();

    const cleanOptions = options
      .map((option) => option.trim())
      .filter((option) => option !== "");

    if (!cleanQuestion) {
      setError("Please enter a question.");
      return;
    }

    if (cleanOptions.length < 2) {
      setError("Please enter at least 2 options.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/polls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: cleanQuestion,
          options: cleanOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not create poll.");

        if (response.status === 401) {
          logout();
        }

        return;
      }

      setCreatedPoll(data);

      setMyPolls((currentPolls) => [
        data,
        ...currentPolls,
      ]);

      setQuestion("");
      setOptions(["", ""]);

    } catch (error) {
      setError("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     COPY POLL LINK
  ========================= */

  const copyPollLink = (pollId) => {
    const link = `${window.location.origin}/poll/${pollId}`;

    navigator.clipboard.writeText(link);

    alert("Poll link copied!");
  };

  /* =========================
     PROTECTED PAGE
  ========================= */

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app">
      <div className="container">

        {/* =========================
            TOP BAR
        ========================= */}

        <div className="top-bar">
          <div className="brand">
            <div className="brand-icon">⚡</div>
            <span>LivePoll</span>
          </div>

          <div className="user-area">
            <span className="user-name">
              Welcome, <strong>{username}</strong>
            </span>

            <button
              className="logout-button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
        {/* =========================
            HERO
        ========================= */}

        <div className="hero">

          <h1>Create. Share. Watch Live.</h1>

          <p>
            Build interactive polls and watch your audience's
            votes update instantly in real time.
          </p>

        </div>

        {/* =========================
            CREATED POLL
        ========================= */}

        {createdPoll && (
          <div className="created-card">

            <div className="created-icon">
              ✓
            </div>

            <div className="created-content">

              <span className="created-label">
                POLL CREATED
              </span>

              <h2>
                {createdPoll.question}
              </h2>

              <p>
                Your poll is ready. Open the live results
                or share the poll with your audience.
              </p>

              <div className="created-actions">

                <button
                  className="live-results-button"
                  onClick={() =>
                    navigate(`/poll/${createdPoll.id}`)
                  }
                >
                  Open Live Results
                </button>

                <button
                  className="copy-button"
                  onClick={() =>
                    copyPollLink(createdPoll.id)
                  }
                >
                  📋 Copy Poll Link
                </button>

              </div>

            </div>

          </div>
        )}

        {/* =========================
            CREATE POLL
        ========================= */}

        <div className="card">

          <h2>Create a New Poll</h2>

          <p className="section-subtitle">
            Ask a question and add options for your audience.
          </p>

          <label>Question</label>

          <input
            type="text"
            placeholder="e.g. What is your favorite programming language?"
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
          />

          <label>Options</label>

          {options.map((option, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) =>
                handleOptionChange(
                  index,
                  e.target.value
                )
              }
            />
          ))}

          <button
            className="secondary-button"
            onClick={addOption}
          >
            + Add Option
          </button>

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          <button
            className="create-button"
            onClick={createPoll}
            disabled={loading}
          >
            {loading
              ? "Creating Poll..."
              : "Create Poll"}
          </button>

        </div>

        {/* =========================
            MY POLLS
        ========================= */}

        <div className="card">

          <div className="section-heading">

            <div>
              <h2>My Polls</h2>

              <p className="section-subtitle">
                Open any poll to watch the results update live.
              </p>
            </div>

            <span className="poll-count">
              {myPolls.length}{" "}
              {myPolls.length === 1
                ? "poll"
                : "polls"}
            </span>

          </div>

          {pollsLoading ? (

            <div className="empty-state">
              <p>Loading your polls...</p>
            </div>

          ) : myPolls.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                📊
              </div>

              <h3>
                No polls yet
              </h3>

              <p>
                Create your first poll and start
                collecting votes.
              </p>

            </div>

          ) : (

            <div className="poll-list">

              {myPolls.map((poll) => (

                <div
                  className="poll-card"
                  key={poll.id}
                >

                  <div className="poll-card-top">

                    <span className="live-badge">

                      <span className="live-dot"></span>

                      LIVE

                    </span>

                    <span className="poll-date">
                      {poll.createdAt
                        ? new Date(
                            poll.createdAt
                          ).toLocaleDateString()
                        : ""}
                    </span>

                  </div>

                  <h3>
                    {poll.question}
                  </h3>

                  <p className="poll-options">
                    {poll.options.length}{" "}
                    {poll.options.length === 1
                      ? "option"
                      : "options"}
                  </p>

                  <div className="poll-card-actions">

                    <button
                      className="live-results-button"
                      onClick={() =>
                        navigate(
                          `/poll/${poll.id}`
                        )
                      }
                    >
                      📊 View Live Results
                    </button>

                    <button
                      className="copy-button"
                      onClick={() =>
                        copyPollLink(poll.id)
                      }
                    >
                      📋 Copy Link
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>
    </div>
  );
}

/* =========================
   POLL PAGE
========================= */

function PollPage() {
  const { id } = useParams();

  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] =
    useState("");

  const [error, setError] = useState("");
  const [voted, setVoted] = useState(false);

  /* =========================
     CHECK VOTE STATUS
  ========================= */

  useEffect(() => {

    fetch(`${API_URL}/polls/${id}/vote-status`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {

        if (data.voted) {
          setVoted(true);
        }

      })
      .catch(() => {

        console.log(
          "Could not check vote status"
        );

      });

  }, [id]);


  /* =========================
     WEBSOCKET
  ========================= */

  useEffect(() => {
    let ws;
    let reconnectTimer;

    let reconnectAttempts = 0;

    let isClosing = false;

    const connectWebSocket = () => {

      ws = new WebSocket(
        `wss://hcl-guvi-live-poll.onrender.com/ws/polls/${id}`
      );

      ws.onopen = () => {

        console.log(
          "WebSocket connected"
        );

        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {

        try {

          const update =
            JSON.parse(event.data);

          setPoll((currentPoll) => {

            if (!currentPoll) {
              return currentPoll;
            }

            return {
              ...currentPoll,

              votes: {
                ...currentPoll.votes,

                [update.option]:
                  update.count,
              },
            };
          });

        } catch (error) {

          console.log(
            "Invalid WebSocket message"
          );

        }
      };

      ws.onerror = () => {

        console.log(
          "WebSocket connection error"
        );

      };

      ws.onclose = () => {

        console.log(
          "WebSocket disconnected"
        );

        if (isClosing) {
          return;
        }

        reconnectAttempts++;

        const delay = Math.min(
          1000 *
            Math.pow(
              2,
              reconnectAttempts - 1
            ),
          10000
        );

        console.log(
          `Reconnecting WebSocket in ${
            delay / 1000
          } seconds...`
        );

        reconnectTimer =
          setTimeout(() => {
            connectWebSocket();
          }, delay);
      };
    };

    connectWebSocket();

    return () => {

      isClosing = true;

      clearTimeout(
        reconnectTimer
      );

      if (ws) {
        ws.close();
      }
    };

  }, [id]);

  /* =========================
     LOAD POLL
  ========================= */

  useEffect(() => {

    fetch(`${API_URL}/polls/${id}`)

      .then((response) =>
        response.json()
      )

      .then((data) => {

        if (data.error) {

          setError(
            data.error
          );

          return;
        }

        setPoll(data);

      })

      .catch(() => {

        setError(
          "Could not load poll."
        );

      });

  }, [id]);

  /* =========================
     ERROR PAGE
  ========================= */

  if (error && !poll) {

    return (
      <div className="app">

        <div className="container">

          <div className="card">

            <h2>
              ❌ Poll Error
            </h2>

            <p>
              {error}
            </p>

            <button
              className="secondary-button"
              onClick={() =>
                window.location.href = "/"
              }
            >
              Back to Dashboard
            </button>

          </div>

        </div>

      </div>
    );
  }

  /* =========================
     LOADING
  ========================= */

  if (!poll) {

    return (
      <div className="app">

        <div className="container">

          <div className="card">

            <p>
              Loading poll...
            </p>

          </div>

        </div>

      </div>
    );
  }

  /* =========================
     VOTE
  ========================= */

  const vote = async () => {

    if (!selectedOption) {

      setError(
        "Please select an option."
      );

      return;
    }

    setError("");

    try {

      const response = await fetch(
        `${API_URL}/polls/${id}/vote`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            option:
              selectedOption,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {

        setError(
          data.error ||
            "Could not record vote."
        );

        return;
      }

      setVoted(true);

    } catch (error) {

      setError(
        "Could not connect to backend."
      );

    }
  };

  /* =========================
     TOTAL VOTES
  ========================= */

  const totalVotes =
    Object.values(
      poll.votes || {}
    ).reduce(
      (total, count) =>
        total + count,
      0
    );

  return (
    <div className="app">

      <div className="container">

        <div className="card">

          {/* =========================
              LIVE HEADER
          ========================= */}

          <div className="poll-live-header">

            <span className="live-badge">

              <span className="live-dot"></span>

              LIVE POLL

            </span>

            <h1>
              {poll.question}
            </h1>

            <p className="section-subtitle">
              Results update automatically
              as people vote.
            </p>

          </div>

          {/* =========================
              VOTING
          ========================= */}

          {!voted ? (

            <>

              <label>
                Select one option
              </label>

              {poll.options.map(
                (option) => (

                  <label
                    key={option}
                    className="option"
                  >

                    <input
                      type="radio"
                      name="poll-option"
                      value={option}
                      checked={
                        selectedOption ===
                        option
                      }
                      onChange={(e) =>
                        setSelectedOption(
                          e.target.value
                        )
                      }
                    />

                    <span>
                      {option}
                    </span>

                  </label>

                )
              )}

              {error && (

                <p className="error">
                  {error}
                </p>

              )}

              <button
                className="create-button"
                onClick={vote}
              >
                Submit Vote
              </button>

            </>

          ) : (

            <div className="success-card">

              <div className="created-icon">
                ✓
              </div>

              <div>

                <span className="created-label">
                  VOTE RECORDED
                </span>

                <h2>
                  Thank you for voting!
                </h2>

                <p>
                  Watch the results below
                  update in real time.
                </p>

              </div>

            </div>

          )}

          <hr />

          {/* =========================
              LIVE RESULTS
          ========================= */}

          <div className="section-heading">

            <div>

              <h2>
                Live Results
              </h2>

              <p className="section-subtitle">
                Real-time vote distribution
              </p>

            </div>

            <span className="poll-count">
              {totalVotes}{" "}
              {totalVotes === 1
                ? "vote"
                : "votes"}
            </span>

          </div>

          {poll.options.map(
            (option) => {

              const count =
                poll.votes[option] || 0;

              const percentage =
                totalVotes === 0
                  ? 0
                  : (count /
                      totalVotes) *
                    100;

              return (

                <div
                  key={option}
                  className="result"
                >

                  <div className="result-header">

                    <span>
                      {option}
                    </span>

                    <strong>
                      {count}{" "}
                      (
                      {percentage.toFixed(
                        0
                      )}
                      %)
                    </strong>

                  </div>

                  <div className="result-bar">

                    <div
                      className="result-fill"
                      style={{
                        width: `${percentage}%`,
                      }}
                    ></div>

                  </div>

                </div>

              );
            }
          )}

        </div>

      </div>

    </div>
  );
}

/* =========================
   APP
========================= */

function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/poll/:id"
          element={<PollPage />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;