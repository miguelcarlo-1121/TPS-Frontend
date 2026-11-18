import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Navbar,
  Footer,
  Reveal,
  Photo,
  container,
  btnGhost,
} from "../components/Layout";
import { CLINIC } from "../data/clinic";
import { apiFetch, getUser } from "../auth";
import echo from "../echo";
import { Search, Plus, X, Phone } from "lucide-react";
import SkeletonBlock from "../components/SkeletonBlock";

const avatarWrap = "size-11 shrink-0 overflow-hidden rounded-full bg-[#aac6b7]";
const avatarWrapLg = "size-14 shrink-0 overflow-hidden rounded-full bg-[#aac6b7]";
const avatarImg = "size-full object-cover";

function AvatarFallback() {
  return <div className="size-full bg-[#aac6b7]" aria-hidden="true" />;
}

export default function Contact() {
  const currentUser = getUser();
  const [allUsers, setAllUsers] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(Boolean(currentUser));
  const [messagesLoading, setMessagesLoading] = useState(Boolean(currentUser));
  const [message, setMessage] = useState("");
  const [sendError, setSendError] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef(null);

  // 1. Kunin ang lahat ng users para sa "New Message"
  useEffect(() => {
    if (!currentUser) {
      setContactsLoading(false);
      setMessagesLoading(false);
      return;
    }
    apiFetch("/messages/contacts")
      .then((data) => {
        setAllUsers(data);
        if (data.length > 0 && !activeChat) {
          setActiveChat(data[0].id);
          setRecentChats([data[0]]);
        }
      })
      .catch((err) => console.error("Failed to load contacts", err))
      .finally(() => setContactsLoading(false));
  }, [currentUser]);

  // 2. Load Existing Messages
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    setMessagesLoading(true);
    setSendError("");
    apiFetch(`/messages?contact_id=${activeChat}`)
      .then((data) => setMessages(data))
      .catch((err) => setSendError("Could not load messages."))
      .finally(() => setMessagesLoading(false));
  }, [activeChat, currentUser]);

  // 3. Real-time Listener
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    const ids = [currentUser.id, parseInt(activeChat)].sort((a, b) => a - b);
    const channel = echo.private(`chat.${ids[0]}.${ids[1]}`);

    channel.listen("MessageSent", (e) => {
      if (e.message.sender_id === parseInt(activeChat) || e.message.receiver_id === parseInt(activeChat)) {
         setMessages((prev) => [...prev, e.message]);
      }
    });

    return () => echo.leaveChannel(`private-chat.${ids[0]}.${ids[1]}`);
  }, [activeChat, currentUser]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  // 4. Send Message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;
    const text = message.trim();
    setMessage(""); 
    try {
      const newMsg = await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify({ receiver_id: activeChat, message: text }),
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      setSendError("Failed to send message.");
      setMessage(text); 
    }
  };

  // 5. Start New Chat
  const startNewChat = (user) => {
    setActiveChat(user.id);
    setRecentChats((prev) => {
      if (!prev.find((c) => c.id === user.id)) {
        return [user, ...prev];
      }
      return prev;
    });
    setIsModalOpen(false);
    setSearchQuery("");
  };

  const active = allUsers.find((c) => c.id === activeChat);
  
  const filteredUsers = allUsers.filter((u) => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="font-sans text-[#202020] flex flex-col min-h-screen relative">
      <Navbar />
      
      <main className="bg-white flex-1 py-12 flex flex-col">
        <div className={`${container} flex-1 flex flex-col`}>
          
          <Reveal>
            <p className="m-0 text-[13px] font-bold tracking-[0.1em] text-tf-teal">CONTACT</p>
            <h1 className="mb-3 mt-2 font-serif text-[2.5rem] text-[#111]">
              We&apos;re <em className="italic text-tf-teal">here to listen.</em>
            </h1>
            <p className="m-0 mb-8 max-w-xl text-[#666]">
              Message the clinic or your psychologist, or send a new inquiry below.
            </p>
          </Reveal>

          <Reveal delay={80} className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col lg:flex-row flex-1 min-h-[500px] max-h-[calc(100vh-250px)] overflow-hidden rounded-[18px] border border-black/28 bg-[linear-gradient(107deg,#eafdeb_0%,#ffffff_14%)]">
              
              <aside className="flex w-full lg:w-[320px] shrink-0 flex-col border-b lg:border-b-0 lg:border-r border-[#e5e5e5] bg-white/60">
                <div className="border-b border-[#e5e5e5] p-6 shrink-0 flex items-center justify-between">
                  <h2 className="mb-0 mt-0 font-serif text-[1.6rem] text-[#222b28]">Messages</h2>
                  <button onClick={() => setIsModalOpen(true)} className="p-2 rounded-full hover:bg-gray-200 text-tf-teal transition-colors">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {contactsLoading ? (
                    <div className="grid gap-2 p-4" role="status" aria-label="Loading conversations">
                      <span className="sr-only">Loading conversations…</span>
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="flex items-center gap-3 px-2 py-3">
                          <SkeletonBlock className="size-11 shrink-0 rounded-full" />
                          <div className="grid flex-1 gap-2">
                            <SkeletonBlock className="h-3 w-32 rounded" />
                            <SkeletonBlock className="h-3 w-20 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentChats.length === 0 ? (
                     <p className="p-6 text-sm text-gray-500">No active chats.</p>
                  ) : (
                    recentChats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveChat(c.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[#e5e5e5] px-6 py-4 text-left transition-colors ${
                          activeChat === c.id ? "bg-[#f2f7f4]" : "bg-transparent hover:bg-white"
                        }`}
                      >
                        <div className={avatarWrap}>
                          <Photo src={c.avatar} alt={c.name} className={avatarImg} fallback={<AvatarFallback />} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="block font-serif text-[0.95rem]">{c.name}</strong>
                          <p className="m-0 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8rem] text-[#666]">
                            {c.role}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </aside>

              {active ? (
                <section className="flex flex-1 flex-col min-h-0 bg-white">
                  <header className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={avatarWrapLg}>
                        <Photo src={active.avatar} className={avatarImg} fallback={<AvatarFallback />} />
                      </div>
                      <div>
                        <h3 className="mb-1 mt-0 font-serif text-[1.1rem]">{active.name}</h3>
                        <p className="m-0 text-[0.8rem] text-[#666] uppercase tracking-wider">{active.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {active.phone && (
                        <a
                          href={`tel:${active.phone}`}
                          className="p-2 text-tf-teal hover:bg-tf-teal/10 rounded-full transition-colors"
                          title="Call via Phone"
                        >
                          <Phone size={20} />
                        </a>
                      )}
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto bg-[#fafafa] p-6 flex flex-col gap-4">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="mt-auto grid gap-4" role="status" aria-label="Loading messages">
                        <span className="sr-only">Loading messages…</span>
                        {[0, 1, 2].map((item) => (
                          <div key={item} className={`flex ${item % 2 ? "justify-end" : "justify-start"}`}>
                            <SkeletonBlock className={`h-16 w-3/5 rounded-2xl ${item % 2 ? "rounded-br-sm" : "rounded-bl-sm"}`} />
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="m-auto max-w-sm rounded-2xl border border-dashed border-[#b6d2c4] bg-white px-6 py-10 text-center">
                        <p className="m-0 font-serif text-base text-[#3d5c52]">No messages yet</p>
                        <p className="m-0 mt-2 text-sm text-[#666]">
                          Say hello to start the conversation with {active.name}.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isUser = msg.sender_id === currentUser?.id;
                        return (
                          <div key={msg.id} className={`flex max-w-[75%] items-end gap-3 ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
                            {!isUser && (
                              <div className={avatarWrap}>
                                <Photo src={active.avatar} className={avatarImg} fallback={<AvatarFallback />} />
                              </div>
                            )}
                            <div className={`px-4 py-3 ${isUser ? "rounded-[16px_16px_4px_16px] bg-tf-teal text-white" : "rounded-[16px_16px_16px_4px] border border-black/10 bg-white"}`}>
                              <p className="mb-1.5 mt-0 text-[0.9rem] leading-[1.4]">{msg.message}</p>
                              <span className={`text-[0.65rem] ${isUser ? "opacity-80" : "opacity-60"}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="shrink-0 border-t border-[#e5e5e5] px-6 py-4 bg-white" onSubmit={handleSend}>
                    {sendError && <p role="alert" className="mb-2 text-sm text-red-700">{sendError}</p>}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 rounded-xl border border-[#666]/35 px-5 py-3 font-serif outline-none focus:border-tf-teal transition-shadow focus:shadow-[0_0_0_3px_rgba(74,155,142,0.15)]"
                      />
                      <button type="submit" className="cursor-pointer rounded-xl border-0 bg-tf-navy px-6 font-serif font-bold text-white hover:opacity-90 transition-opacity">
                        Send
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
                  <p>Select a conversation or start a new one.</p>
                  <button onClick={() => setIsModalOpen(true)} className={`${btnGhost} mt-4`}>
                    New Message
                  </button>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />

      {/* NEW MESSAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="m-0 font-serif text-lg text-[#202020]">New Message</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-tf-teal focus:bg-white transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {contactsLoading ? (
                <div className="grid gap-3 p-3" role="status" aria-label="Loading users">
                  <span className="sr-only">Loading users…</span>
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl p-3">
                      <SkeletonBlock className="size-11 shrink-0 rounded-full" />
                      <div className="grid flex-1 gap-2">
                        <SkeletonBlock className="h-3 w-32 rounded" />
                        <SkeletonBlock className="h-3 w-20 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">No users found.</p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startNewChat(u)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  >
                    <div className={avatarWrap}>
                      <Photo src={u.avatar} className={avatarImg} fallback={<AvatarFallback />} />
                    </div>
                    <div>
                      <strong className="block font-serif text-[0.95rem] text-[#202020]">{u.name}</strong>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{u.role}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}