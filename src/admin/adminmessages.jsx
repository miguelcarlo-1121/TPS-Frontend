import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AdminNavigation from "./adminnavigation";
import { apiFetch, getUser } from "../auth";
import echo from "../echo";
import { Search, Send, MessageSquare, Phone } from "lucide-react";
import { Photo } from "../components/Layout";
import ProfileMenu from "../components/ProfileMenu";
import SkeletonBlock from "../components/SkeletonBlock";

const avatarWrap = "size-11 shrink-0 overflow-hidden rounded-full bg-[#aac6b7]";
const avatarImg = "size-full object-cover";

function AvatarFallback() {
  return <div className="size-full bg-[#aac6b7]" aria-hidden="true" />;
}

export default function AdminMessages() {
  const [searchParams] = useSearchParams();
  const initialContactId = searchParams.get("contact_id");

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);
  const currentUser = getUser();

  // 1. Kunin lahat ng users
  useEffect(() => {
    setContactsLoading(true);
    apiFetch("/messages/contacts")
      .then((data) => {
        setContacts(data);
        if (initialContactId) {
          setActiveChat(initialContactId);
        } else if (data.length > 0 && !activeChat) {
          setActiveChat(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setContactsLoading(false));
  }, [initialContactId]);

  // 2. Load messages
  useEffect(() => {
    if (!activeChat) return;
    setMessagesLoading(true);
    apiFetch(`/messages?contact_id=${activeChat}`)
      .then((data) => setMessages(data))
      .catch(console.error)
      .finally(() => setMessagesLoading(false));
  }, [activeChat]);

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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      alert("Failed to send.");
    }
  };

  const active = contacts.find((c) => c.id === activeChat);
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
      <div className="hidden lg:block">
        <AdminNavigation />
      </div>

      <main className="min-w-0 flex-1 p-4 sm:p-8 h-screen flex flex-col">
        <header className="mb-6 flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="m-0 font-serif text-[32px] font-bold text-[#2f4a42]">Messages</h1>
            <p className="m-0 mt-1 text-[#666]">Communicate with your clients and team.</p>
          </div>
          <ProfileMenu size={37} />
        </header>

        <div className="flex-1 flex bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm min-h-0">
          
          {/* SIDEBAR */}
          <aside className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50 shrink-0">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-tf-teal text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contactsLoading ? [0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3 border-b border-gray-100 p-4" aria-hidden="true">
                  <SkeletonBlock className="size-11 shrink-0 rounded-full" />
                  <div className="flex-1">
                    <SkeletonBlock className="h-3 w-32 rounded" />
                    <SkeletonBlock className="mt-2 h-2.5 w-20 rounded" />
                  </div>
                </div>
              )) : filteredContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChat(c.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-gray-100 ${
                    activeChat === c.id ? "bg-white" : "hover:bg-white"
                  }`}
                >
                  <div className={avatarWrap}>
                    <Photo src={c.avatar} className={avatarImg} fallback={<AvatarFallback />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block font-serif text-sm text-[#202020] truncate">{c.name}</strong>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.role}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* CHAT AREA */}
          {active ? (
            <section className="flex-1 flex flex-col min-h-0 bg-white">
              <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center">
                  <div className={avatarWrap}>
                    <Photo src={active.avatar} className={avatarImg} fallback={<AvatarFallback />} />
                  </div>
                  <div className="ml-3">
                    <h3 className="m-0 font-serif text-lg text-[#202020]">{active.name}</h3>
                    <p className="m-0 text-xs text-tf-teal font-bold uppercase">{active.role}</p>
                  </div>
                </div>

                {/* Phone calls remain available from the contact's phone number. */}
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

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[#fafafa]">
                {messagesLoading ? (
                  <div className="space-y-4" aria-busy="true">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className={`flex ${row === 1 ? "justify-end" : ""}`}>
                        <div className="w-2/3 max-w-[420px] rounded-2xl border border-gray-200 bg-white p-4">
                          <SkeletonBlock className="h-3 w-full rounded" />
                          <SkeletonBlock className="mt-2 h-3 w-3/4 rounded" />
                          <SkeletonBlock className="mt-3 h-2 w-14 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="m-auto text-center text-gray-400">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Say hi to {active.name}!</p>
                  </div>
                ) : contactsLoading ? (
                  <section className="flex-1 bg-white p-6" aria-busy="true">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                      <SkeletonBlock className="size-11 rounded-full" />
                      <div>
                        <SkeletonBlock className="h-4 w-36 rounded" />
                        <SkeletonBlock className="mt-2 h-3 w-20 rounded" />
                      </div>
                    </div>
                    <div className="flex h-[60%] flex-col justify-end gap-4 py-6">
                      <SkeletonBlock className="h-12 w-2/3 rounded-2xl" />
                      <SkeletonBlock className="ml-auto h-12 w-1/2 rounded-2xl" />
                      <SkeletonBlock className="h-12 w-3/4 rounded-2xl" />
                    </div>
                    <SkeletonBlock className="h-12 w-full rounded-xl" />
                  </section>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex max-w-[70%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                        <div className={`px-4 py-2 rounded-2xl ${isMe ? "bg-tf-teal text-white" : "bg-white border border-gray-200 text-[#202020]"}`}>
                          <p className="m-0 text-sm">{msg.message}</p>
                          <span className={`block mt-1 text-[10px] ${isMe ? "text-white/70 text-right" : "text-gray-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your reply..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-tf-teal text-sm"
                  />
                  <button type="submit" className="bg-tf-navy text-white px-6 rounded-xl font-bold hover:opacity-90 flex items-center justify-center">
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </section>
          ) : (
             <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a conversation.
             </div>
          )}
        </div>
      </main>

    </div>
  );
}