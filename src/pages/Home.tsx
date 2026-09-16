//src/pages/Home.tsx

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Note = {
  id: number;
  title: string;
  body: string;
  updated: string;
};

type Group = {
  id: number;
  name: string;
}; 

type Alarm = {
  id: number;
  group_id: number;
  label: string;
  date_time: string;
};

function saveToCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to cache:", error);
  }
}

function loadFromCache<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    console.log('saved: ', saved)
    console.log('localStorage: ', localStorage)

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("Error loading from cache:", error);
    return fallback;
  }
}

// const steps = [
//   "Create the shell",
//   "Make it installable",
//   "Make it offline",
//   "Test the boundary",
//   "Deploy it",
// ];

const starterNotes: Note[] = [
  {
    id: 1,
    title: "What makes a PWA?",
    body: "A manifest, a service worker, and a reliable user experience.",
    updated: "Today",
  },
];

export default function Home() {

const [groups, setGroups] = useState<Group[]>(() =>
  loadFromCache<Group[]>("groups", [])
);
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("notes") || "null") ||
        starterNotes
      );
    } catch {
      return starterNotes;
    }
  });

  // const [done, setDone] = useState<number[]>([]);
  // const [online, setOnline] = useState(navigator.onLine);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>(() =>
    loadFromCache<Alarm[]>("alarms", [])
  );
  const [alarmLabel, setAlarmLabel] = useState("");
  const [alarmDateTime, setAlarmDateTime] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [audioPlaying, setAudioPlaying] = useState(false);
  const Audio = useRef<HTMLAudioElement>(null)

  
  const handlePlayAudio = () => {
    // console.log('Audio', Audio)
    if (!Audio.current) return
    setAudioPlaying(true)
    Audio.current.play()
  }



  // const progress = useMemo(
  //   () => Math.round((done.length / steps.length) * 100),
  //   [done]
  // );

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

useEffect(() => {
  if (!online) return;

  async function syncGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error syncing groups:", error);
      return;
    }

    if (!data) return;
    if (data?.length == 0) return;

    const cachedGroups = loadFromCache<Group[]>("groups", []);

    const cached = JSON.stringify(cachedGroups);
    const database = JSON.stringify(data);

    // Nothing changed.
    if (cached === database) {
      return;
    }

    // Database has changed, so update the cache.
    saveToCache("groups", data);

    // Update the displayed groups from the new cache.
    setGroups(data);
    console.log('data: ',data)
    console.log('cached: ', cached)
  }

  syncGroups();
}, [online]);
  
useEffect(() => {
  async function createUser() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return;
    }

    if (session?.user) {
      setUserId(session.user.id);
      return;
    }

    const { data, error: signInError } =
      await supabase.auth.signInAnonymously();

    if (signInError) {
      console.error("Error creating anonymous user:", signInError);
      return;
    }

    if (data.user) {
      setUserId(data.user.id);
    }
  }

  createUser();
}, []);

useEffect(() => {
  if (!userId) return;

  async function loadJoinedGroups() {
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading joined groups:", error);
      return;
    }

    setJoinedGroupIds(data.map((membership) => membership.group_id));
  }

  loadJoinedGroups();
}, [userId, online]);

useEffect(() => {
  if (!activeGroupId) {
    setAlarms([]);
    return;
  }

  async function syncAlarms() {
    // Always start from the locally cached alarms.
    const cachedAlarms = loadFromCache<Alarm[]>("alarms", []);

    const cachedForGroup = cachedAlarms.filter(
      (alarm) => alarm.group_id === activeGroupId
    );

    setAlarms(cachedForGroup);

    // If we're offline, the cached data is all we have.
    if (!navigator.onLine) {
      return;
    }

    // We're online, so get the latest version from Supabase.
    const { data, error } = await supabase
      .from("alarms")
      .select("id, group_id, label, date_time")
      .eq("group_id", activeGroupId)
      .order("date_time");


      console.log("fetch data: ", data)

    if (error) {
      console.error("Error syncing alarms:", error);

      // Keep the cached alarms if Supabase fails.
      return;
    }

    console.log("data: ", data)
    if (data.length == 0) return
    if (data) {
      setAlarms(data);

      // Keep alarms belonging to other groups in the cache.
      const otherAlarms = cachedAlarms.filter(
        (alarm) => alarm.group_id !== activeGroupId
      );

      saveToCache("alarms", [...otherAlarms, ...data]);
    }
  }

  syncAlarms();
}, [activeGroupId, online, currentTime]);

useEffect(() => {
  const timer = window.setInterval(() => {
    setCurrentTime(Date.now());
  }, 1000);

  return () => {
    window.clearInterval(timer);
  };
}, []);

useEffect(() => {
  if (!audioPlaying) return
  
  const timer = window.setInterval(() => {
    Audio.current?.pause();
    setAudioPlaying(false);

  }, 60 * 1000);

  return () => {
    window.clearInterval(timer);
  };

  
}, [audioPlaying]);

  function addNote() {
    if (!title.trim() || !body.trim()) return;

    setNotes([
      {
        id: Date.now(),
        title: title.trim(),
        body: body.trim(),
        updated: "Just now",
      },
      ...notes,
    ]);

    setTitle("");
    setBody("");
  }

  // function toggleStep(index: number) {
  //   setDone(
  //     done.includes(index)
  //       ? done.filter((x) => x !== index)
  //       : [...done, index]
  //   );
  // }

  async function joinGroup(groupId: number) {
  if (!userId) {
    console.error("No user ID available.");
    return;
  }

  const { error } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
    });

  if (error) {
    if (error.code === "23505") {
      console.log("Already a member of this group.");
      setJoinedGroupIds((current) =>
        current.includes(groupId) ? current : [...current, groupId]
      );
      return;
    }

    console.error("Error joining group:", error);
    return;
  }

  setJoinedGroupIds((current) => [...current, groupId]);
  setActiveGroupId(groupId);

  console.log("Successfully joined group.");
}

async function addAlarm() {
  if (!activeGroupId) {
    console.error("No group selected.");
    return;
  }

  if (!alarmLabel.trim() || !alarmDateTime) {
    return;
  }

  const { data, error } = await supabase
    .from("alarms")
    .insert({
      group_id: activeGroupId,
      label: alarmLabel.trim(),
      date_time: new Date(alarmDateTime).toISOString(),
    })
    .select("id, group_id, label, date_time")
    .single();

  if (error) {
    console.error("Error adding alarm:", error);
    return;
  }

if (data) {
  setAlarms((current) => {
    const updated = [...current, data].sort(
      (a, b) =>
        new Date(a.date_time).getTime() -
        new Date(b.date_time).getTime()
    );

    const allCachedAlarms = loadFromCache<Alarm[]>("alarms", []);

    const otherAlarms = allCachedAlarms.filter(
      (alarm) => alarm.group_id !== activeGroupId
    );

    saveToCache("alarms", [...otherAlarms, ...updated]);

    return updated;
  });
}

  setAlarmLabel("");
  setAlarmDateTime("");
}

function getAlarmState(dateTime: string) {
  const alarmTime = new Date(dateTime).getTime();
  const oneMinute = 60 * 1000;

  if (currentTime < alarmTime) {
    return "future";
  }

  if (currentTime < alarmTime + oneMinute) {
    setAudioPlaying(true);
    return "active";
  }

  return "past";
}




  return (
    
<div className="shell">
  <header className="app-header">
    <div className="header-brand">
      <strong>One Alarm v4</strong>
    </div>

    <span className={`connection-status ${online ? "is-online" : "is-offline"}`}>
      {online ? "Online" : "Offline"}
    </span>
  </header>

  <aside className="sidebar">
    <section className="groups-section">
      <h2 className="sidebar-title">Available Groups</h2>

      <div className="groups-list">
        {groups.map((group) => {
          const isJoined = joinedGroupIds.includes(group.id);

          return (
            <button
              key={group.id}
              className={`group-button ${
                isJoined ? "group-joined" : "group-available"
              } ${activeGroupId === group.id ? "group-active" : ""}`}
              onClick={() => {
                if (isJoined) {
                  setActiveGroupId(group.id);
                } else {
                  joinGroup(group.id);
                }
              }}
            >
              <span className="group-info">
                <span className="group-avatar">
                  {group.name.charAt(0)}
                </span>

                <span className="group-name">
                  {group.name}
                </span>
              </span>

              <span className="group-action">
                {isJoined ? "✓ Joined" : "Join"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  </aside>

  <main className="dashboard-main">
    <div className="dashboard-content">
      <p className="eyebrow">FOUNDATION TRACK</p>

      {activeGroupId ? (
        <h1 className="dashboard-title">
          {groups.find((group) => group.id === activeGroupId)?.name}
        </h1>
      ) : (
        <h1 className="dashboard-title">
          Select a group to get started.
        </h1>
      )}

      {activeGroupId && (
        <section className="alarms-section">
          <div className="section-heading">
            <div className="section-icon">♧</div>
            <h2>Alarms</h2>
          </div>

          <div className="alarms-list">
            {alarms.length === 0 ? (
              <p className="empty-state">
                No alarms have been added to this group yet.
              </p>
            ) : (
              alarms.map((alarm) => {
                const state = getAlarmState(alarm.date_time);

                return (
                  <article
                    key={alarm.id}
                    className={`alarm-card alarm-${state}`}
                  >
                    <div className="alarm-icon">
                      {state === "active" ? "✓" : "◷"}
                    </div>

                    <div className="alarm-content">
                      <h3>{alarm.label}</h3>

                      <p>
                        {new Date(alarm.date_time).toLocaleString()}
                      </p>
                    </div>

                    <span className="alarm-status">
                      {state === "active"
                        ? "Active"
                        : state === "past"
                        ? "Overdue"
                        : "Upcoming"}
                    </span>

                    <button
                      type="button"
                      className="alarm-menu"
                      aria-label={`Options for ${alarm.label}`}
                    >
                      ⋮
                    </button>
                  </article>
                );
              })
            )}
          </div>

          <form
            className="add-alarm-form"
            onSubmit={(event) => {
              event.preventDefault();
              addAlarm();
            }}
          >
            <div className="form-heading">
              <span className="form-heading-icon">+</span>
              <h2>Add an alarm</h2>
            </div>

            <div className="form-fields">
              <label className="form-field">
                <span>Label</span>

                <input
                  className="form-input"
                  value={alarmLabel}
                  onChange={(event) =>
                    setAlarmLabel(event.target.value)
                  }
                  placeholder="e.g. Orientation"
                />
              </label>

              <label className="form-field">
                <span>Date and time</span>

                <input
                  className="form-input"
                  type="datetime-local"
                  value={alarmDateTime}
                  onChange={(event) =>
                    setAlarmDateTime(event.target.value)
                  }
                />
              </label>
            </div>

            <button className="add-alarm-button" type="submit">
              <span>+</span>
              Add alarm
            </button>
          </form>
        </section>
      )}
    </div>

        {/* <audio
          style={{
            visibility: 'hidden',
          }}
          className="audio-player"
          ref={Audio}
          src="/audio.mp3"
          controls
          loop
        /> */}

    <div className="dashboard-sidebar">
      <section className="author-card">
        <div className="author-icon">◯</div>

        <div className="author-details">
          <p className="author-label">Project By:</p>
          <p className="author-name">Obe Fortune Olotu</p>
        </div>

        <div className="author-divider" />

        <div className="matric-details">
          <p className="author-label">Matric No:</p>
          <p className="matric-number">2024/1/95114CP</p>
        </div>
      </section>

      <section className="audio-card">
        <div className="audio-heading">
          <span className="audio-icon">♫</span>
          <h2>Audio</h2>
        </div>

        <audio
          className="audio-player"
          ref={Audio}
          src="/audio.mp3"
          controls
          loop
        />

        <button
          className="play-audio-button"
          onClick={handlePlayAudio}
        >
          <span>▶</span>
          Play Audio
        </button>
      </section>
    </div>
  </main>
</div>


  );
}