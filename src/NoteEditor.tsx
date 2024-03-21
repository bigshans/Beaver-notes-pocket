import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "./store/types";
import { lowlight } from "lowlight";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Bubblemenu from "./components/Editor/Bubblemenu";
import Toolbar from "./components/Editor/Toolbar";
import Document from "@tiptap/extension-document";
import { Keyboard } from "@capacitor/keyboard";
import Placeholder from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import "./css/NoteEditor.module.css";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import OrderedList from "@tiptap/extension-list-item";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Link from "@tiptap/extension-link";
import Text from "@tiptap/extension-text";
import { NoteLabel } from "./lib/tiptap/NoteLabel";
import NoteLabels from "./components/Editor/NoteLabel";
import BubleMenutable from "./components/Editor/Bubblemenutable";
import Mathblock from "./lib/tiptap/math-block/Index";
import {
  blackCallout,
  blueCallout,
  greenCallout,
  purpleCallout,
  redCallout,
  yellowCallout,
} from "./lib/tiptap/Callouts/Index";
import CodeBlockComponent from "./lib/tiptap/CodeBlockComponent";
import HeadingTree from "./lib/HeadingTree";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { isPlatform } from "@ionic/react";
import BulletList from "@tiptap/extension-bullet-list";
import Drawer from "./components/Editor/Drawer";
import SearchAndReplace from "./lib/tiptap/search-&-replace";
import Find from "./components/Editor/Find";
// import Paper from "./lib/tiptap/paper/Paper"

// Icons

import Focus3LineIcon from "remixicon-react/Focus3LineIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import ArrowLeftLineIcon from "remixicon-react/ArrowLeftLineIcon";

// Languages
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { useDataPath } from "./store/useDataPath";

lowlight.registerLanguage("html", html);
lowlight.registerLanguage("css", css);
lowlight.registerLanguage("js", js);
lowlight.registerLanguage("ts", ts);

const extensions = [
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({ lowlight }),
  Document,
  NoteLabel,
  Text,
  blackCallout,
  blueCallout,
  greenCallout,
  purpleCallout,
  redCallout,
  yellowCallout,
  StarterKit,
  Link,
  Mathblock,
  Highlight,
  Table,
  TableCell,
  SearchAndReplace,
  TableHeader,
  TableRow,
  Underline,
  Placeholder,
  OrderedList,
  TaskList,
  BulletList,
  TaskItem.configure({
    nested: true,
  }),
  ImageResize.extend({
    addNodeView() {
      const viewer = this.parent?.() as any;
      return (props) => {
        const attrs = props.node.attrs;
        const node = {
          ...props.node,
          attrs: { ...attrs, src: useDataPath().getRemotePath(attrs.src) },
        };
        console.log("img", node);
        const newProps = { ...props, node };
        console.log(newProps);
        return viewer(newProps);
      };
    },
  }),
];

type Props = {
  note: Note;
  onCloseEditor: () => void;
  onChange: (content: JSONContent, title?: string) => void;
  isFullScreen?: boolean;
  title: string;
  onTitleChange: (newTitle: string) => void;
};

function NoteEditor({
  note,
  onChange,
  onTitleChange,
  onCloseEditor,
  isFullScreen = false,
}: Props) {
  const [localTitle, setLocalTitle] = useState<string>(note.title);

  const handleTitleChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const newTitle = event.currentTarget.innerHTML;
    console.log("New Title:", newTitle);
    setLocalTitle(newTitle);
    onTitleChange(newTitle);
    onChange(editor?.getJSON() || ({} as JSONContent), newTitle);
  };

  useEffect(() => {
    // Update local title when the note changes
    setLocalTitle(note.title);
  }, [note.title]);

  const editor = useEditor(
    {
      extensions,
      content: note.content,
      editorProps: {
        attributes: {
          class: "overflow-auto outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();
        onChange(editorContent);
      },
    },
    [note.id]
  );

  const [focusMode, setFocusMode] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const handleHeadingClick = (heading: string) => {
    console.log("Heading clicked:", heading);
  };

  const [headingTreeVisible, setHeadingTreeVisible] = useState(false);

  const toggleHeadingTree = () => {
    setHeadingTreeVisible(!headingTreeVisible);
  };

  const headingTreeRef = useRef<HTMLDivElement | null>(null);

  // Close heading tree when clicking outside
  const handleOutsideClick = useCallback(
    (event: MouseEvent) => {
      if (
        headingTreeVisible &&
        headingTreeRef.current &&
        event.target instanceof Node &&
        !headingTreeRef.current.contains(event.target)
      ) {
        setHeadingTreeVisible(false);
      }
    },
    [headingTreeVisible]
  );

  useEffect(() => {
    // Attach the event listener
    document.addEventListener("mousedown", handleOutsideClick);

    // Detach the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleOutsideClick]);

  const addPaddingTop = isPlatform("ios") ? "pt-6 sm:pt-1" : "";

  const navigate = useNavigate();

  const handleSwipe = (eventData: any) => {
    const isRightSwipe = eventData.dir === "Right";
    const isSmallSwipe = Math.abs(eventData.deltaX) < 250;

    if (isRightSwipe && isSmallSwipe) {
      eventData.event.preventDefault();
    } else if (isRightSwipe) {
      navigate(-1); // Navigate back
    }
  };

  const handlers = useSwipeable({
    onSwiped: handleSwipe,
  });

  const [showFind, setShowFind] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "f" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setShowFind(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });

    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const [wd, setwd] = useState<boolean>(localStorage.getItem('expand-editor') === 'true');

  useEffect(() => {
    setwd(localStorage.getItem('expand-editor') === 'true');
  }, []);

  return (
    <div {...handlers}>
      <div
        className={`sm:ml-16 editor overflow-auto h-full justify-center items-start px-4 ${wd ? 'sm:px-10 md:px-10 lg:px-30' : 'sm:px-10 md:px-20 lg:px-60'} text-black dark:text-white text-base`}
        onDragOver={(e) => e.preventDefault()}
      >
        <Toolbar
          toolbarVisible={toolbarVisible}
          isFullScreen={isFullScreen}
          note={note}
          onCloseEditor={onCloseEditor}
          noteId={note.id}
          editor={editor}
          toggleHeadingTree={toggleHeadingTree}
        />
        {headingTreeVisible && editor && (
          <div
            ref={headingTreeRef}
            className={`transition-opacity  ${
              headingTreeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <HeadingTree onHeadingClick={handleHeadingClick} />
          </div>
        )}
        <div
          className={`sm:hidden bg-white dark:bg-[#232222] px-2 fixed top-0 inset-x-0 overflow-auto h-auto w-full z-10 no-scrollbar flex justify-between ${addPaddingTop}`}
        >
          <button
            className="p-2 mt-4 align-start rounded-md text-white bg-transparent cursor-pointer"
            onClick={onCloseEditor}
          >
            <ArrowLeftLineIcon className="border-none dark:text-white text-neutral-800 text-xl w-7 h-7" />
          </button>
          <div className="flex">
            <button
              className="p-2  mt-4 rounded-md text-white bg-transparent cursor-pointer"
              onClick={() => {
                setFocusMode((prevFocusMode) => !prevFocusMode);
                setToolbarVisible((prevToolbarVisible) => !prevToolbarVisible);
              }}
            >
              <Focus3LineIcon
                className={`border-none ${
                  focusMode ? "text-amber-400" : "text-neutral-800"
                }  dark:text-white text-xl w-7 h-7`}
              />
            </button>
            <button
              className="p-2 align-end mt-4 rounded-md text-white bg-transparent cursor-pointer"
              onClick={toggleHeadingTree}
            >
              <Search2LineIcon
                className={`border-none ${
                  focusMode ? "hidden" : "block"
                }  dark:text-white text-neutral-800 text-xl w-7 h-7`}
              />
            </button>
          </div>
        </div>
        <Bubblemenu editor={editor} />
        <BubleMenutable editor={editor} />
        <div
          contentEditable
          suppressContentEditableWarning
          className="text-3xl mt-[2.1em] font-bold overflow-y-scroll outline-none sm:mt-2"
          onBlur={handleTitleChange}
          dangerouslySetInnerHTML={{ __html: localTitle }}
        />
        <div>
          <NoteLabels note={note} onChange={onChange} />
          <div className="py-2 h-full w-full" id="container">
            <EditorContent
              editor={editor}
              className="overflow-auto w-full mb-[6em] min-h-[25em] editor-content"
            />
          </div>
        </div>
        <div className="sm:ml-16 fixed px-4 w-full inset-x-0 sm:px-10 md:px-20 lg:px-60  bottom-24 sm:bottom-6">
          {showFind && <Find editor={editor} />}
        </div>
        <div className={` ${focusMode ? "hidden" : "block"}  sm:hidden`}>
          <Drawer
            isVisible={isKeyboardVisible}
            noteId={note.id}
            note={note}
            editor={editor}
          />
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
