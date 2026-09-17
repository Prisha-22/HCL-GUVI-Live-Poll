import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:8080";

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
        setMessage("Account created! You can now login.");
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
      <div className="container">
        <div className="card">
          <h1>{isRegister ? "Create Account" : "Login"}</h1>

          <p className="subtitle">
            {isRegister
              ? "Create an account to create polls."
              : "Login to create a poll."}
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
              ? "Register"
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

function Home() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [createdPoll, setCreatedPoll] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    navigate("/login");
  };

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

      setQuestion("");
      setOptions(["", ""]);
    } catch (error) {
      setError("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app">
      <div className="container">

        <div className="top-bar">
          <span>
            Logged in as <strong>{username}</strong>
          </span>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>

        <h1>HCL GUVI Live Poll</h1>

        <p className="subtitle">
          Create a poll and share it with your audience.
        </p>

        <div className="card">
          <h2>Create a Poll</h2>

          <label>Question</label>

          <input
            type="text"
            placeholder="Enter your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <label>Options</label>

          {options.map((option, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) =>
                handleOptionChange(index, e.target.value)
              }
            />
          ))}

          <button
            className="secondary-button"
            onClick={addOption}
          >
            + Add Option
          </button>

          {error && <p className="error">{error}</p>}

          <button
            className="create-button"
            onClick={createPoll}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Poll"}
          </button>
        </div>

        {createdPoll && (
          <div className="card success-card">
            <h2>🎉 Poll Created!</h2>

            <p>
              <strong>{createdPoll.question}</strong>
            </p>

            <p>
              Share this link with your audience:
            </p>

            <div className="share-row">
                <div className="share-box">
                  {window.location.origin}/poll/{createdPoll.id}
                </div>

                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/poll/${createdPoll.id}`
                    );
                    alert("Poll link copied!");
                  }}
                >
                  📋 Copy Link
                </button>
              </div>
          </div>
        )}

      </div>
    </div>
  );
}

function PollPage() {
  const { id } = useParams();

  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [error, setError] = useState("");
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8080/ws/polls/${id}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);

      setPoll((currentPoll) => {
        if (!currentPoll) {
          return currentPoll;
        }

        return {
          ...currentPoll,
          votes: {
            ...currentPoll.votes,
            [update.option]: update.count,
          },
        };
      });
    };

    ws.onerror = () => {
      console.log("WebSocket connection error");
    };

    return () => {
      ws.close();
    };
  }, [id]);

  useEffect(() => {
    fetch(`${API_URL}/polls/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }

        setPoll(data);
      })
      .catch(() => {
        setError("Could not load poll.");
      });
  }, [id]);

  if (error) {
    return (
      <div className="app">
        <div className="container">
          <div className="card">
            <h2>❌ Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="app">
        <div className="container">
          <div className="card">
            <p>Loading poll...</p>
          </div>
        </div>
      </div>
    );
  }

  const vote = async () => {
    if (!selectedOption) {
      setError("Please select an option.");
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/polls/${id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            option: selectedOption,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Could not record vote."
        );
        return;
      }

      setVoted(true);
    } catch (error) {
      setError("Could not connect to backend.");
    }
  };

  const totalVotes = Object.values(
    poll.votes || {}
  ).reduce(
    (total, count) => total + count,
    0
  );

  return (
    <div className="app">
      <div className="container">
        <div className="card">

          <h1>{poll.question}</h1>

          {!voted ? (
            <>
              <p>Select one option:</p>

              {poll.options.map((option) => (
                <label
                  key={option}
                  className="option"
                >
                  <input
                    type="radio"
                    name="poll-option"
                    value={option}
                    checked={
                      selectedOption === option
                    }
                    onChange={(e) =>
                      setSelectedOption(
                        e.target.value
                      )
                    }
                  />

                  <span>{option}</span>
                </label>
              ))}

              {error && (
                <p className="error">
                  {error}
                </p>
              )}

              <button
                className="create-button"
                onClick={vote}
              >
                Vote
              </button>
            </>
          ) : (
            <div>
              <h2>✅ Vote recorded!</h2>

              <p>
                Thank you for voting.
              </p>
            </div>
          )}

          <hr />

          <h2>📊 Live Results</h2>

          {poll.options.map((option) => {
            const count =
              poll.votes[option] || 0;

            const percentage =
              totalVotes === 0
                ? 0
                : (count / totalVotes) * 100;

            return (
              <div
                key={option}
                className="result"
              >
                <div className="result-header">
                  <span>{option}</span>

                  <strong>
                    {count} (
                    {percentage.toFixed(0)}
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
          })}

        </div>
      </div>
    </div>
  );
}

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

      </Routes>
    </BrowserRouter>
  );
}

export default App;