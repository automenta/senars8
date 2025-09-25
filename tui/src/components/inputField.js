import blessed from 'blessed';

/**
 * Creates the input field component.
 * @returns {blessed.textarea} The input field component.
 */
export function createInputField() {
  return blessed.textarea({
    top: 2,
    right: 0,
    width: '30%',
    height: '30%-2',
    content: '{bold}Available Commands:{/bold}\n\n{green}!start{/green} | Start agent\n{red}!stop{/red} | Stop agent\n{magenta}!reset{/magenta} | Reset agent\n{green}!add <task>{/green} | Add a task\n{yellow}!query <text>{/yellow} | Query the agent\n{cyan}!view [type]{/cyan} | View tasks (beliefs/goals/questions)\n{cyan}!filter [type]{/cyan} | Filter tasks\n{blue}!search <query>{/blue} | Search tasks\n{magenta}!stats{/magenta} | System stats\n{yellow}!config{/yellow} | Configuration\n{green}!read <path>{/green} | Read a file\n{green}!write <path> <content>{/green} | Write to a file\n{green}!ls [path]{/green} | List directory\n{green}!mkdir <path>{/green} | Create directory\n{green}!create <path>{/green} | Create file\n{green}!run <cmd>{/green} | Run command\n{green}!execute <id>{/green} | Execute task\n{green}!pause <id>{/green} | Pause task\n{green}!delete <id>{/green} | Delete task\n{green}!list{/green} | List tasks\n{green}!prioritize <id> <p>{/green} | Set task priority\n{green}!sort [type]{/green} | Sort tasks\n{green}!dashboard{/green} | Real-time dashboard\n{green}!reasoning{/green} | Show reasoning trace\n{green}!cleartrace{/green} | Clear reasoning traces\n{green}!refresh{/green} | Refresh view\n{red}!clear{/red} | Clear displays\n!help | Show help',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'green',
      bg: 'black',
      border: {
        fg: 'green'
      },
      focus: {
        border: {
          fg: 'yellow'
        }
      }
    },
    mouse: true,
    inputOnFocus: true,
    scrollable: true,
    alwaysScroll: true
  });
}