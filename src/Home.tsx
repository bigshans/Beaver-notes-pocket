import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import "./css/NoteEditor.module.css";
import { JSONContent } from "@tiptap/react";
import Sidebar from "./components/Sidebar";
import BottomNavBar from "./components/BottomNavBar";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import "./css/main.css";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import JSZip from "jszip";
import { Share } from "@capacitor/share";

// Import Remix icons
import AddFillIcon from "remixicon-react/AddFillIcon";
import DeleteBinLineIcon from "remixicon-react/DeleteBinLineIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import Bookmark3LineIcon from "remixicon-react/Bookmark3LineIcon";
import Bookmark3FillIcon from "remixicon-react/Bookmark3FillIcon";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import ArchiveDrawerFillIcon from "remixicon-react/InboxUnarchiveLineIcon";
import Upload2LineIcon from "remixicon-react/Upload2LineIcon";
import Download2LineIcon from "remixicon-react/Download2LineIcon";
import ArrowDownS from "remixicon-react/ArrowDownSLineIcon";
import LockClosedIcon from "remixicon-react/LockLineIcon";
import LockOpenIcon from "remixicon-react/LockUnlockLineIcon";

async function createNotesDirectory() {
  const directoryPath = "notes";

  try {
    await Filesystem.mkdir({
      path: directoryPath,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (error: any) {
    console.error("Error creating the directory:", error);
  }
}

const App: React.FC = () => {
  const loadNotes = async () => {
    try {
      await createNotesDirectory(); // Create the directory before reading/writing

      const fileExists = await Filesystem.stat({
        path: STORAGE_PATH,
        directory: Directory.Documents,
      });

      if (fileExists) {
        const data = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Documents,
          encoding: FilesystemEncoding.UTF8,
        });

        if (data.data) {
          const parsedData = JSON.parse(data.data as string);

          if (parsedData?.data?.notes) {
            return parsedData.data.notes;
          } else {
            console.log(
              "The file is missing the 'notes' data. Returning an empty object."
            );
            return {};
          }
        } else {
          console.log("The file is empty. Returning an empty object.");
          return {};
        }
      } else {
        console.log("The file doesn't exist. Returning an empty object.");
        return {};
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      return {};
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (isConfirmed) {
      try {
        const notes = await loadNotes();

        if (notes[noteId]) {
          delete notes[noteId];

          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({ data: { notes } }),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });

          setNotesState(notes);
          location.reload();
        } else {
          console.log(`Note with id ${noteId} not found.`);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Error deleting note: " + (error as any).message);
      }
    }
  };

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  // State to manage dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  // Function to toggle dark mode
  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  const STORAGE_PATH = "notes/data.json";

  const saveNote = React.useCallback(
    async (note: unknown) => {
      try {
        const notes = await loadNotes();

        if (typeof note === "object" && note !== null) {
          const typedNote = note as Note;

          // Use getTime() to get the Unix timestamp in milliseconds
          const createdAtTimestamp =
            typedNote.createdAt instanceof Date
              ? typedNote.createdAt.getTime()
              : Date.now();

          const updatedAtTimestamp =
            typedNote.updatedAt instanceof Date
              ? typedNote.updatedAt.getTime()
              : Date.now();

          notes[typedNote.id] = {
            ...typedNote,
            createdAt: createdAtTimestamp,
            updatedAt: updatedAtTimestamp,
          };

          const data = {
            data: {
              notes,
            },
          };

          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify(data),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });
        } else {
          console.error("Invalid note object:", note);
        }
      } catch (error) {
        console.error("Error saving note:", error);
      }
    },
    [loadNotes]
  );

  const handleToggleBookmark = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent event propagation

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Toggle the 'isBookmarked' property
      updatedNote.isBookmarked = !updatedNote.isBookmarked;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes); // Update the state
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      alert("Error toggling bookmark: " + (error as any).message);
    }
  };

  const handleToggleArchive = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent event propagation

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Toggle the 'isArchived' property
      updatedNote.isArchived = !updatedNote.isArchived;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes); // Update the state
    } catch (error) {
      console.error("Error toggling archive:", error);
      alert("Error toggling archive: " + (error as any).message);
    }
  };

  const [notesState, setNotesState] = useState<Record<string, Note>>({});

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

  useEffect(() => {
    const loadNotesFromStorage = async () => {
      const notes = await loadNotes();
      setNotesState(notes);
    };

    loadNotesFromStorage();
  }, []);

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      const titleMatch = note.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const contentMatch = JSON.stringify(note.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return titleMatch || contentMatch;
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, notesState]);

  const handleCloseEditor = () => {
    setActiveNoteId(null);
  };

  const exportData = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD

      // Create the parent export folder
      const parentExportFolderPath = `export`;
      await Filesystem.mkdir({
        path: parentExportFolderPath,
        directory: Directory.Documents,
        recursive: true,
      });

      // Create the export folder structure
      const exportFolderName = `Beaver Notes ${formattedDate}`;
      const exportFolderPath = `${parentExportFolderPath}/${exportFolderName}`;

      // Create the export folder
      await Filesystem.mkdir({
        path: exportFolderPath,
        directory: Directory.Documents,
        recursive: true,
      });

      // Export data.json
      const exportedData: any = {
        data: {
          notes: {},
          lockedNotes: {}, // Add the lockedNotes field
        },
        labels: [], // Add the labels field
      };

      // Iterate through notes to populate the exportedData object
      Object.values(notesState).forEach((note) => {
        const createdAtTimestamp =
          note.createdAt instanceof Date ? note.createdAt.getTime() : 0;
        const updatedAtTimestamp =
          note.updatedAt instanceof Date ? note.updatedAt.getTime() : 0;

        // Populate notes object
        exportedData.data.notes[note.id] = {
          id: note.id,
          title: note.title,
          content: note.content,
          labels: note.labels,
          createdAt: createdAtTimestamp,
          updatedAt: updatedAtTimestamp,
          isBookmarked: note.isBookmarked,
          isArchived: note.isArchived,
          isLocked: note.isLocked,
          lastCursorPosition: note.lastCursorPosition,
        };

        // Populate labels array
        exportedData.labels = exportedData.labels.concat(note.labels);

        // Populate lockedNotes object
        if (note.isLocked) {
          exportedData.data.lockedNotes[note.id] = true;
        }
      });

      // Remove duplicate labels
      exportedData.labels = Array.from(new Set(exportedData.labels));

      const jsonData = JSON.stringify(exportedData, null, 2);
      const jsonFilePath = `${exportFolderPath}/data.json`;

      // Save data.json
      await Filesystem.writeFile({
        path: jsonFilePath,
        data: jsonData,
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      // Check if the images folder exists
      const imagesFolderPath = `images`;
      let imagesFolderExists = false;

      try {
        const imagesFolderInfo = await (Filesystem as any).getInfo({
          path: imagesFolderPath,
          directory: Directory.Documents,
        });
        imagesFolderExists = imagesFolderInfo.type === "directory";
      } catch (error) {
        console.error("Error checking images folder:", error);
      }

      if (imagesFolderExists) {
        // Export images folder
        const exportImagesFolderPath = `${exportFolderPath}/${imagesFolderPath}`;

        // Create the images folder in the export directory
        await Filesystem.mkdir({
          path: exportImagesFolderPath,
          directory: Directory.Documents,
          recursive: true,
        });

        // Copy images folder to export folder
        await Filesystem.copy({
          from: imagesFolderPath,
          to: exportImagesFolderPath,
          directory: Directory.Documents,
        });
      }

      // Zip the export folder
      const zip = new JSZip();
      const exportFolderZip = zip.folder(`Beaver Notes ${formattedDate}`);

      // Retrieve files in the export folder
      const exportFolderFiles = await Filesystem.readdir({
        path: exportFolderPath,
        directory: Directory.Documents,
      });

      // Use Promise.all to wait for all asynchronous file reading operations to complete
      await Promise.all(
        exportFolderFiles.files.map(async (file) => {
          const filePath = `${exportFolderPath}/${file.name}`;
          const fileContent = await Filesystem.readFile({
            path: filePath,
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });
          exportFolderZip!.file(file.name, fileContent.data);
        })
      );

      const zipContentBase64 = await zip.generateAsync({ type: 'base64' });

      const zipFilePath = `/Beaver_Notes_${formattedDate}.zip`;
      await Filesystem.writeFile({
        path: zipFilePath,
        data: zipContentBase64,
        directory: Directory.Cache,
      });

      await shareZipFile();

      console.log("Export completed successfully!");

      // Notify the user
      window.alert("Export completed successfully! Check your downloads.");
    } catch (error) {
      console.error("Error exporting data and images:", error);
      alert("Error exporting data and images: " + (error as any).message);
    }
  };

  const shareZipFile = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      const zipFilePath = `file:///Cache/Beaver_Notes_${formattedDate}.zip`;
  
      console.log("Sharing zip file from path:", zipFilePath);
  
      const result = await Filesystem.getUri({
        directory: Directory.Cache,
        path: 'Beaver_Notes_2024-01-10.zip',
      });
      
      const resolvedFilePath = result.uri;

      await Share.share({
        title: 'Share Beaver Notes Export',
        text: 'Check out my Beaver Notes export!',
        url: resolvedFilePath,
        dialogTitle: 'Share Beaver Notes Export',
      });
    } catch (error) {
      console.error('Error sharing zip file:', error);
      alert('Error sharing zip file: ' + (error as any).message);
    }
  };  
  
  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        if (importedData && importedData.data && importedData.data.notes) {
          const importedNotes: Record<string, Note> = importedData.data.notes;

          // Load existing notes from data.json
          const existingNotes = await loadNotes();

          // Merge the imported notes with the existing notes
          const mergedNotes: Record<string, Note> = {
            ...existingNotes,
            ...importedNotes,
          };

          // Update the notesState with the merged notes
          setNotesState(mergedNotes);

          // Update the filteredNotes based on the search query
          const filtered = Object.values(mergedNotes).filter((note) => {
            const titleMatch = note.title
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            const contentMatch = JSON.stringify(note.content)
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            return titleMatch || contentMatch;
          });

          setFilteredNotes(
            Object.fromEntries(filtered.map((note) => [note.id, note]))
          );

          Object.values(importedNotes).forEach((note) => {
            note.createdAt = new Date(note.createdAt);
            note.updatedAt = new Date(note.updatedAt);
          });

          // Save the merged notes to the data.json file
          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({ data: { notes: mergedNotes } }),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });

          alert("Data imported successfully!");
        } else {
          alert("Invalid data format.");
        }
      } catch (error) {
        console.error("Error while importing data:", error);
        alert("Error while importing data.");
      }
    };

    reader.readAsText(file);
  };

  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  const [title, setTitle] = useState(
    activeNoteId ? notesState[activeNoteId].title : ""
  );
  
  const handleChangeNoteContent = (content: JSONContent, newTitle?: string) => {
    if (activeNoteId) {
      const existingNote = notesState[activeNoteId];
      const updatedTitle =
        newTitle !== undefined && newTitle.trim() !== ""
          ? newTitle
          : existingNote.title;

      const updateNote = {
        ...existingNote,
        updatedAt: new Date(),
        content,
        title: updatedTitle,
      };

      setNotesState((prevNotes) => ({
        ...prevNotes,
        [activeNoteId]: updateNote,
      }));

      saveNote(updateNote);
    }
  };

  const handleCreateNewNote = () => {
    const newNote = {
      id: uuid(),
      title: "New Note",
      content: { type: "doc", content: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      labels: [],
      isBookmarked: false,
      isArchived: false,
      isLocked: false,
      lastCursorPosition: 0,
    };
    setNotesState((prevNotes) => ({
      ...prevNotes,
      [newNote.id]: newNote,
    }));
    setActiveNoteId(newNote.id);
    saveNote(newNote);
  };

  const [isArchiveVisible, setIsArchiveVisible] = useState(false);

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    const updatedAtA = a.updatedAt instanceof Date ? a.updatedAt : new Date(0);
    const updatedAtB = b.updatedAt instanceof Date ? b.updatedAt : new Date(0);
    return updatedAtA.getTime() - updatedAtB.getTime();
  });

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return "No content...";
    }

    // Check if the content consists of a single empty paragraph
    if (
      content.content.length === 1 &&
      content.content[0].type === "paragraph" &&
      (!content.content[0].content || content.content[0].content.length === 0)
    ) {
      return ""; // Return an empty string for a single empty paragraph
    }

    const paragraphText = content.content
      .filter((node) => node.type === "paragraph") // Filter paragraph nodes
      .map((node) => {
        if (node.content && Array.isArray(node.content)) {
          const textContent = node.content
            .filter((innerNode) => innerNode.type === "text") // Filter text nodes within paragraphs
            .map((innerNode) => innerNode.text) // Get the text from text nodes
            .join(" "); // Join text from text nodes within the paragraph
          return textContent;
        }
        return ""; // Return an empty string for nodes without content
      })
      .join(" "); // Join paragraph text with spaces

    return paragraphText || "No content"; // If no paragraph text, return "No content"
  }

  function truncateContentPreview(
    content: JSONContent | string | JSONContent[]
  ) {
    let text = "";

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = extractParagraphTextFromContent(jsonContent);
    } else if (content && content.content) {
      const { title, ...contentWithoutTitle } = content;
      text = extractParagraphTextFromContent(contentWithoutTitle);
    }

    if (text.trim() === "") {
      return "No content"; // Show a placeholder for No content
    } else if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      return text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
    }
  }

  const uniqueLabels = Array.from(
    new Set(Object.values(notesState).flatMap((note) => note.labels))
  );

  const handleLabelFilterChange = (selectedLabel: string) => {
    setSearchQuery("");
    const filteredNotes = Object.values(notesState).filter((note) => {
      return selectedLabel ? note.labels.includes(selectedLabel) : true;
    });

    setFilteredNotes(
      Object.fromEntries(filteredNotes.map((note) => [note.id, note]))
    );
  };

  const handleToggleLock = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Stop the click event from propagating

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Check if biometrics is available
      const biometricResult = await NativeBiometric.isAvailable();

      if (biometricResult.isAvailable) {
        const isFaceID = biometricResult.biometryType === BiometryType.FACE_ID;

        // Show biometric prompt for authentication
        try {
          await NativeBiometric.verifyIdentity({
            reason: "For note authentication",
            title: "Authenticate",
            subtitle: "Use biometrics to unlock/lock the note.",
            description: isFaceID
              ? "Place your face for authentication."
              : "Place your finger for authentication.",
          });
        } catch (verificationError) {
          // Handle verification error (e.g., user cancels biometric prompt)
          console.error("Biometric verification error:", verificationError);
          alert(
            "Biometric verification failed. Note remains in its current state."
          );
          return;
        }
      } else {
        // Biometrics not available, use sharedKey
        let sharedKey = localStorage.getItem("sharedKey");

        if (!sharedKey) {
          // If no shared key is set, prompt the user to set it up
          sharedKey = prompt("Set up a password to lock/unlock your notes:");

          if (!sharedKey) {
            // If the user cancels or enters an empty password, do not proceed
            alert(
              "Note remains in its current state. Please set up a password next time."
            );
            return;
          }

          // Save the shared key in local storage
          localStorage.setItem("sharedKey", sharedKey);
        }

        // Prompt for the password
        const enteredKey = prompt(
          "Enter the password to lock/unlock the note:"
        );

        if (enteredKey !== sharedKey) {
          // Incorrect password, do not proceed
          alert("Incorrect password. Note remains in its current state.");
          return;
        }
      }

      // Toggle the 'isLocked' property
      updatedNote.isLocked = !updatedNote.isLocked;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      // Update the lockedNotes field
      const lockedNotes = JSON.parse(
        localStorage.getItem("lockedNotes") || "{}"
      );
      if (updatedNote.isLocked) {
        lockedNotes[noteId] = true;
      } else {
        delete lockedNotes[noteId];
      }
      localStorage.setItem("lockedNotes", JSON.stringify(lockedNotes));

      // Save the updated notes to the filesystem
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes); // Update the state

      console.log("Note lock status toggled successfully!");
      alert("Note lock status toggled successfully!");
    } catch (error) {
      console.error("Error toggling lock:", error);
      alert("Error toggling lock: " + (error as any).message);
    }
  };

  const handleClickNote = async (note: Note) => {
    try {
      if (note.isLocked) {
        // Check if biometrics is available
        const biometricResult = await NativeBiometric.isAvailable();

        if (biometricResult.isAvailable) {
          const isFaceID =
            biometricResult.biometryType === BiometryType.FACE_ID;

          // Show biometric prompt for authentication
          try {
            await NativeBiometric.verifyIdentity({
              reason: "For note authentication",
              title: "Authenticate",
              subtitle: "Use biometrics to unlock the note.",
              description: isFaceID
                ? "Place your face for authentication."
                : "Place your finger for authentication.",
            });
          } catch (verificationError) {
            // Handle verification error (e.g., user cancels biometric prompt)
            console.error("Biometric verification error:", verificationError);
            alert("Biometric verification failed. Note remains locked.");
            return;
          }
        } else {
          // Biometrics not available, use sharedKey
          const userSharedKey = prompt(
            "Enter the shared key to unlock the note:"
          );

          // Check if the entered key matches the stored key
          const storedSharedKey = localStorage.getItem("sharedKey");
          if (userSharedKey !== storedSharedKey) {
            alert("Incorrect shared key. Note remains locked.");
            return;
          }
        }
      }

      setActiveNoteId(note.id);
    } catch (error) {
      console.error("Error handling click on note:", error);
      alert("Error handling click on note: " + (error as any).message);
    }
  };

  return (
    <div className="grid grid-cols-[auto] sm:grid-cols-[auto,1fr] h-screen dark:text-white bg-white dark:bg-[#232222]">
      <Sidebar
        onCreateNewNote={handleCreateNewNote}
        isDarkMode={darkMode}
        toggleTheme={() => toggleTheme(!darkMode)}
        exportData={exportData}
        handleImportData={handleImportData}
      />

      <div className="overflow-y w-screen">
        {!activeNoteId && (
          <div className="py-2 w-full flex flex-col border-gray-300 overflow-auto">
            <div className="bg-transparent px-6">
              <div className="flex justify-center">
                <div className="apply relative w-full md:w-[22em] mb-2 h-12 p-4 bg-[#F8F8F7] dark:bg-[#2D2C2C] align-middle inline rounded-full text-gray-800 cursor-pointer flex items-center justify-start dark:text-white mr-2;">
                  <div>
                    <Search2LineIcon className="text-gray-800 dark:text-white h-6 w-6" />
                  </div>
                  <input
                    className="text-xl text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] px-2 outline-none dark:text-white w-full"
                    type="text"
                    placeholder="Search notes"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative inline-flex">
                    <select
                      id="labelSelect"
                      onChange={(e) => handleLabelFilterChange(e.target.value)}
                      className="rounded-full ml-2 pl-4 pr-10 p-3 h-12 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
                    >
                      <option value="">Select Label</option>
                      {uniqueLabels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-2/3 pointer-events-none" />
                  </div>
              </div>
              <div className="items-center">
                <div className="md:w-[22em] h-12 flex items-center justify-start mx-auto sm:hidden overflow-hidden">
                  <div className="border-r-2 border-gray-300 dark:border-neutral-800 p-3 rounded-l-full bg-[#F8F8F7] text-center dark:bg-[#2D2C2C] flex-grow text-gray-800 dark:bg-[#2D2C2C] dark:text-white outline-none">
                    <button
                      className="bg-[#F8F8F7] w-full dark:bg-[#2D2C2C] dark:text-white rounded-full font-semibold text-gray-800 cursor-pointer flex items-center justify-center"
                      onClick={exportData}
                    >
                      <Upload2LineIcon />
                    </button>
                  </div>
                  <div className="border-l-2 border-gray-300 dark:border-neutral-800 p-3 rounded-r-full bg-[#F8F8F7] dark:bg-[#2D2C2C] text-center flex-grow mr-2 text-gray-800 dark:bg-[#2D2C2C] dark:text-white outline-none">
                    <div className="bg-[#F8F8F7] w-full dark:bg-[#2D2C2C] dark:text-white rounded-full font-semibold text-gray-800 cursor-pointer flex items-center justify-center">
                      <label htmlFor="importData">
                        <Download2LineIcon />
                      </label>
                      <input
                        className="hidden"
                        type="file"
                        id="importData"
                        accept=".json"
                        onChange={handleImportData}
                      />
                    </div>
                  </div>
                  <div className="relative hidden sm:block inline-flex items-center">
                    <select
                      id="labelSelect"
                      onChange={(e) => handleLabelFilterChange(e.target.value)}
                      className="rounded-full pl-4 pr-10 p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
                    >
                      <option value="">Select Label</option>
                      {uniqueLabels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 mx-6 cursor-pointer rounded-md items-center justify-center h-full">
              {notesList.filter((note) => note.isBookmarked && !note.isArchived)
                .length > 0 && (
                <h2 className="text-3xl font-bold">Bookmarked</h2>
              )}
              <div className="grid py-2 w-full h-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-4 gap-4 cursor-pointer rounded-md items-center justify-center">
                {notesList.map((note) => {
                  if (note.isBookmarked && !note.isArchived) {
                    return (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        className={
                          note.id === activeNoteId
                            ? "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                            : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                        }
                        onClick={() => handleClickNote(note)}
                      >
                        <div className="sm:h-44 h-36 overflow-hidden">
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="text-2xl">{note.title}</div>
                            {note.isLocked ? (
                              <div>
                                <p></p>
                              </div>
                            ) : (
                              <div>
                                {note.labels.length > 0 && (
                                  <div className="flex gap-2">
                                    {note.labels.map((label) => (
                                      <span
                                        key={label}
                                        className="text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
                                      >
                                        #{label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {note.isLocked ? (
                              <div className="flex flex-col items-center">
                                <button className="flex items-center justify-center">
                                  <LockClosedIcon className="w-24 h-24 text-[#52525C] dark:text-white" />
                                </button>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  Unlock to edit
                                </p>
                              </div>
                            ) : (
                              <div className="text-lg">
                                {note.content &&
                                  truncateContentPreview(note.content)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="py-2">
                          <button
                            className="text-[#52525C] py-2 dark:text-white w-auto"
                            onClick={(e) => handleToggleBookmark(note.id, e)}
                          >
                            {note.isBookmarked ? (
                              <Bookmark3FillIcon className="w-8 h-8 mr-2" />
                            ) : (
                              <Bookmark3LineIcon className="w-8 h-8 mr-2" />
                            )}
                          </button>
                          <button
                            className="text-[#52525C] py-2 dark:text-white w-auto"
                            onClick={(e) => handleToggleLock(note.id, e)}
                          >
                            {note.isLocked ? (
                              <LockClosedIcon className="w-8 h-8 mr-2" />
                            ) : (
                              <LockOpenIcon className="w-8 h-8 mr-2" />
                            )}
                          </button>
                          <button
                            className="text-[#52525C] py-2 hover:text-red-500 dark:text-white w-auto w-8 h-8"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <DeleteBinLineIcon className="w-8 h-8 mr-2" />
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              <h2 className="text-3xl font-bold">All Notes</h2>
              {notesList.length === 0 && (
                <div className="mx-auto">
                  <p className="py-2 text-lg text-center">
                    No notes available. Click{" "}
                    <AddFillIcon className="inline-block w-5 h-5" /> to add a
                    new note or click{" "}
                    <Download2LineIcon className="inline-block w-5 h-5" /> to
                    import your data.
                  </p>
                </div>
              )}
              <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-4 gap-4 cursor-pointer rounded-md items-center justify-center">
                {notesList
                  .filter((note) => !note.isBookmarked && !note.isArchived)
                  .map((note) => (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      className={
                        note.id === activeNoteId
                          ? "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                          : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                      }
                      onClick={() => handleClickNote(note)}
                    >
                      <div className="sm:h-44 h-36 overflow-hidden">
                        <div className="flex flex-col h-full overflow-hidden">
                          <div className="text-2xl">{note.title}</div>
                          {note.isLocked ? (
                            <div>
                              <p></p>
                            </div>
                          ) : (
                            <div>
                              {note.labels.length > 0 && (
                                <div className="flex gap-2">
                                  {note.labels.map((label) => (
                                    <span
                                      key={label}
                                      className="text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
                                    >
                                      #{label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {note.isLocked ? (
                            <div className="flex flex-col items-center">
                              <button className="flex items-center justify-center">
                                <LockClosedIcon className="w-24 h-24 text-[#52525C] dark:text-white" />
                              </button>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Unlock to edit
                              </p>
                            </div>
                          ) : (
                            <div className="text-lg">
                              {note.content &&
                                truncateContentPreview(note.content)}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        className="text-[#52525C] py-2 dark:text-white w-auto"
                        onClick={(e) => handleToggleBookmark(note.id, e)} // Pass the event
                      >
                        {note.isBookmarked ? (
                          <Bookmark3FillIcon className="w-8 h-8 mr-2" />
                        ) : (
                          <Bookmark3LineIcon className="w-8 h-8 mr-2" />
                        )}
                      </button>
                      <button
                        className="text-[#52525C] py-2 dark:text-white w-auto"
                        onClick={(e) => handleToggleArchive(note.id, e)} // Pass the event
                      >
                        {note.isBookmarked ? (
                          <ArchiveDrawerFillIcon className="w-8 h-8 mr-2" />
                        ) : (
                          <ArchiveDrawerLineIcon className="w-8 h-8 mr-2" />
                        )}
                      </button>
                      <button
                        className="text-[#52525C] py-2 dark:text-white w-auto"
                        onClick={(e) => handleToggleLock(note.id, e)}
                      >
                        {note.isLocked ? (
                          <LockClosedIcon className="w-8 h-8 mr-2" />
                        ) : (
                          <LockOpenIcon className="w-8 h-8 mr-2" />
                        )}
                      </button>
                      <button
                        className="text-[#52525C] py-2 hover:text-red-500 dark:text-white w-auto w-8 h-8"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <DeleteBinLineIcon className="w-8 h-8 mr-2" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
            <BottomNavBar
              onCreateNewNote={handleCreateNewNote}
              onToggleArchiveVisibility={() =>
                setIsArchiveVisible(!isArchiveVisible)
              }
            />
          </div>
        )}
        <div>
          {activeNote && (
            <NoteEditor
              note={activeNote}
              title={title}
              onTitleChange={setTitle}
              onChange={handleChangeNoteContent}
              onCloseEditor={handleCloseEditor}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
