import ControlPanel from './system/ControlPanel';
import StatusPanel from './system/StatusPanel';
import InputPanel from './interaction/InputPanel';
import LogPanel from './system/LogPanel';
import MemoryViewPanel from './memory/MemoryViewPanel';
import KnowledgeGraphPanel from './memory/KnowledgeGraphPanel';
import ReasonerTracePanel from './reasoning/ReasonerTracePanel';
import VisualReasoningPanel from './reasoning/VisualReasoningPanel';
import InternalStatePanel from './system/InternalStatePanel';
import NotificationCenterPanel from './system/NotificationCenterPanel';
import FileExplorerPanel from './file-system/FileExplorerPanel';
import CodeEditorPanel from './editor/CodeEditorPanel';
import TerminalPanel from './terminal/TerminalPanel';
import LayoutManagerPanel from './LayoutManagerPanel';
import HelpPanel from './help/HelpPanel';
import ConversationHistoryPanel from './interaction/ConversationHistoryPanel';
import SettingsPanel from './settings/SettingsPanel';
import TaskPanel from './task/TaskPanel';
import SessionPanel from './system/SessionPanel';
import DebugPanel from './debug/DebugPanel';
import Chat from './Chat/Chat';

const panelRegistry = {
    'chat': Chat,
    'control': ControlPanel,
    'status': StatusPanel,
    'input': InputPanel,
    'log': LogPanel,
    'memory': MemoryViewPanel,
    'knowledge-graph': KnowledgeGraphPanel,
    'reasoner-trace': ReasonerTracePanel,
    'visual-reasoning': VisualReasoningPanel,
    'internal-state': InternalStatePanel,
    'notifications': NotificationCenterPanel,
    'file-explorer': FileExplorerPanel,
    'code-editor': CodeEditorPanel,
    'terminal': TerminalPanel,
    'layout-manager': LayoutManagerPanel,
    'help': HelpPanel,
    'conversation-history': ConversationHistoryPanel,
    'settings': SettingsPanel,
    'tasks': TaskPanel,
    'sessions': SessionPanel,
    'debug': DebugPanel,
};

export default panelRegistry;
