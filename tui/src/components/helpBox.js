import blessed from 'blessed';

/**
 * Creates the help box component.
 * @returns {blessed.box} The help box component.
 */
export function createHelpBox() {
  return blessed.box({
    top: '50%+3',
    right: 0,
    width: '30%',
    height: '50%-5',
    content: '{bold}Command Help:{/bold}\\n\\n' +
              '{underline}Agent Control:{/underline}\\n' +
              '{green}!start{/green} - Start the agent cycling\\n' +
              '{red}!stop{/red} - Stop the agent cycling\\n' +
              '{magenta}!reset{/magenta} - Reset the agent\\n\\n' +
              '{underline}Task Management:{/underline}\\n' +
              '{green}!add <task>{/green} - Add a new task\\n' +
              '{yellow}!query <text>{/yellow} - Query the agent\\n' +
              '{cyan}!view [type]{/cyan} - View tasks (beliefs/goals/questions)\\n' +
              '{cyan}!filter [type]{/cyan} - Filter tasks\\n' +
              '{blue}!search <query>{/blue} - Search tasks\\n' +
              '{green}!execute <id>{/green} - Execute a specific task\\n' +
              '{green}!pause <id>{/green} - Pause a specific task\\n' +
              '{green}!delete <id>{/green} - Delete a specific task\\n' +
              '{green}!list{/green} - List all tasks in current filter\\n' +
              '{green}!prioritize <id> <p>{/green} - Set task priority\\n' +
              '{green}!sort [type]{/green} - Sort tasks by criteria\\n\\n' +
              '{underline}System:{/underline}\\n' +
              '{magenta}!stats{/magenta} - Show system stats\\n' +
              '{yellow}!config{/yellow} - Show agent config\\n' +
              '{green}!dashboard{/green} - Real-time monitoring dashboard\\n' +
              '{green}!reasoning{/green} - Show reasoning trace\\n' +
              '{green}!export [type] [file]{/green} - Export data (tasks, beliefs, goals, etc.)\\n' +
              '{green}!import <file>{/green} - Import data from file\\n' +
              '{green}!cleartrace{/green} - Clear reasoning traces\\n' +
              '{green}!refresh{/green} - Refresh current view\\n' +
              '{green}!history{/green} - Show command history\\n\\n' +
              '{underline}File Operations:{/underline}\\n' +
              '{green}!read <path>{/green} - Read a file\\n' +
              '{green}!write <path> <content>{/green} - Write to a file\\n' +
              '{green}!ls [path]{/green} - List directory contents\\n' +
              '{green}!mkdir <path>{/green} - Create directory\\n' +
              '{green}!create <path>{/green} - Create an empty file\\n' +
              '{green}!run <cmd>{/green} - Execute a shell command\\n\\n' +
              '{underline}Utilities:{/underline}\\n' +
              '{red}!clear{/red} - Clear displays\\n\\n' +
              '{underline}Examples:{/underline}\\n' +
              '<cat> -> [animal].\\n' +
              '<(animal & bird) --> [cat]!.\\n' +
              'What is a cat?',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'blue'
      }
    },
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true
  });
}