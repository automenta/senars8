import ControlPanel from './system/ControlPanel';
import StatusPanel from './system/StatusPanel';
import InputPanel from './interaction/InputPanel';
import LogPanel from './system/LogPanel';
import MemoryViewPanel from './memory/MemoryViewPanel';
import KnowledgeGraphPanel from './memory/KnowledgeGraphPanel';
import ReasonerTracePanel from './reasoning/ReasonerTracePanel';
import InternalStatePanel from './system/InternalStatePanel';

const panelRegistry = {
    control: ControlPanel,
    status: StatusPanel,
    input: InputPanel,
    log: LogPanel,
    'memory-view': MemoryViewPanel,
    'knowledge-graph': KnowledgeGraphPanel,
    'reasoner-trace': ReasonerTracePanel,
    'internal-state': InternalStatePanel,
};

export default panelRegistry;
