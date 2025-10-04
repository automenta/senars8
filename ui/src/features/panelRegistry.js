import Chat from './Chat/Chat';
import CodeEditorPanel from './editor/CodeEditorPanel';
import ConfigurationEditorPanel from './configuration/ConfigurationEditorPanel';
import ControlPanel from './system/ControlPanel';
import ConversationHistoryPanel from './interaction/ConversationHistoryPanel';
import DashboardPanel from './dashboard/DashboardPanel';
import DebugPanel from './debug/DebugPanel';
import FileExplorerPanel from './file-system/FileExplorerPanel';
import HelpPanel from './help/HelpPanel';
import InputPanel from './interaction/InputPanel';
import InternalStatePanel from './system/InternalStatePanel';
import KnowledgeGraphPanel from './memory/KnowledgeGraphPanel';
import LayoutManagerPanel from './LayoutManagerPanel';
import LogPanel from './system/LogPanel';
import MemoryViewPanel from './memory/MemoryViewPanel';
import NarseseTaskPanel from './task/NarseseTaskPanel';
import NotificationCenterPanel from './system/NotificationCenterPanel';
import ReasonerTracePanel from './reasoning/ReasonerTracePanel';
import ReasoningDebuggerPanel from './reasoning/ReasoningDebuggerPanel';
import SessionPanel from './system/SessionPanel';
import SettingsPanel from './settings/SettingsPanel';
import SidebarPanel from './navigation/SidebarPanel';
import StatusPanel from './system/StatusPanel';
import TaskInspectorPanel from './task/TaskInspectorPanel';
import TaskPanel from './task/TaskPanel';
import TerminalPanel from './terminal/TerminalPanel';
import VisualReasoningPanel from './reasoning/VisualReasoningPanel';

const panelRegistry = {
    'chat': Chat,
    'code-editor': CodeEditorPanel,
    'configuration': ConfigurationEditorPanel,
    'control': ControlPanel,
    'conversation-history': ConversationHistoryPanel,
    'dashboard': DashboardPanel,
    'debug': DebugPanel,
    'file-explorer': FileExplorerPanel,
    'help': HelpPanel,
    'input': InputPanel,
    'internal-state': InternalStatePanel,
    'knowledge-graph': KnowledgeGraphPanel,
    'layout-manager': LayoutManagerPanel,
    'log': LogPanel,
    'memory': MemoryViewPanel,
    'narsese-tasks': NarseseTaskPanel,
    'notifications': NotificationCenterPanel,
    'reasoner-trace': ReasonerTracePanel,
    'reasoning-debugger': ReasoningDebuggerPanel,
    'sessions': SessionPanel,
    'settings': SettingsPanel,
    'sidebar': SidebarPanel,
    'status': StatusPanel,
    'task-inspector': TaskInspectorPanel,
    'tasks': TaskPanel,
    'terminal': TerminalPanel,
    'visual-reasoning': VisualReasoningPanel,
};

export default panelRegistry;