import ControlPanel from './system/ControlPanel';
import StatusPanel from './system/StatusPanel';
import InputPanel from './interaction/InputPanel';
import LogPanel from './system/LogPanel';
import MemoryViewPanel from './memory/MemoryViewPanel';
import KnowledgeGraphPanel from './memory/KnowledgeGraphPanel';
import ReasonerTracePanel from './reasoning/ReasonerTracePanel';
import InternalStatePanel from './system/InternalStatePanel';
import NotificationCenterPanel from './system/NotificationCenterPanel';
import FileExplorerPanel from './file-system/FileExplorerPanel';
import CodeEditorPanel from './editor/CodeEditorPanel';
import TerminalPanel from './terminal/TerminalPanel';
import LayoutManagerPanel from './LayoutManagerPanel';
import HelpPanel from './help/HelpPanel';

const panelRegistry = {
    control: ControlPanel,
    status: StatusPanel,
    input: InputPanel,
    log: LogPanel,
    'memory-view': MemoryViewPanel,
    'knowledge-graph': KnowledgeGraphPanel,
    'reasoner-trace': ReasonerTracePanel,
    'internal-state': InternalStatePanel,
    'notification-center': NotificationCenterPanel,
    'file-explorer': FileExplorerPanel,
    'code-editor': CodeEditorPanel,
    'terminal': TerminalPanel,
    'layout-manager': LayoutManagerPanel,
    'help': HelpPanel,
};

export default panelRegistry;
