export function bashCompletion(): string {
  return `_grimoire() {
  local cur prev words cword
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  words=("\${COMP_WORDS[@]}")
  cword=\${COMP_CWORD}

  # Get the subcommand (first non-option argument)
  local subcommand=""
  local i
  for ((i = 1; i < cword; i++)); do
    if [[ "\${words[i]}" != -* ]]; then
      subcommand="\${words[i]}"
      break
    fi
  done

  # Complete subcommands
  if [[ \${cword} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "run validate create demo completion" -- "\${cur}"))
    return 0
  fi

  # Complete shell argument for completion command
  if [[ "\${subcommand}" == "completion" ]]; then
    if [[ \${cword} -eq 2 ]]; then
      COMPREPLY=($(compgen -W "bash zsh fish" -- "\${cur}"))
    fi
    return 0
  fi

  # Complete flags for run command
  if [[ "\${subcommand}" == "run" ]]; then
    if [[ "\${cur}" == -* ]]; then
      COMPREPLY=($(compgen -W "-o --output -f --format -q --quiet --dry-run --mock --json" -- "\${cur}"))
    elif [[ "\${prev}" == "-f" ]] || [[ "\${prev}" == "--format" ]]; then
      COMPREPLY=($(compgen -W "json yaml env" -- "\${cur}"))
    elif [[ "\${prev}" == "-o" ]] || [[ "\${prev}" == "--output" ]]; then
      COMPREPLY=($(compgen -f -- "\${cur}"))
    elif [[ "\${prev}" == "--mock" ]]; then
      COMPREPLY=()
    else
      # Complete config file path
      COMPREPLY=($(compgen -f -- "\${cur}"))
    fi
    return 0
  fi

  # Complete flags for validate command
  if [[ "\${subcommand}" == "validate" ]]; then
    if [[ "\${cur}" == -* ]]; then
      COMPREPLY=()
    else
      # Complete config file path
      COMPREPLY=($(compgen -f -- "\${cur}"))
    fi
    return 0
  fi

  # Complete flags for create command
  if [[ "\${subcommand}" == "create" ]]; then
    if [[ "\${cur}" == -* ]]; then
      COMPREPLY=()
    else
      # Complete output file path
      COMPREPLY=($(compgen -f -- "\${cur}"))
    fi
    return 0
  fi

  # Complete flags for demo command
  if [[ "\${subcommand}" == "demo" ]]; then
    COMPREPLY=()
    return 0
  fi

  return 0
}

complete -o bashdefault -o default -o nospace -F _grimoire grimoire
`;
}

export function zshCompletion(): string {
  return `#compdef grimoire

_grimoire() {
  local -a subcommands
  subcommands=(
    'run:Run a wizard from a config file'
    'validate:Validate a wizard config file without running it'
    'create:Interactively scaffold a new wizard config file'
    'demo:Run a demo wizard showcasing all step types'
    'completion:Output shell completion script'
  )

  local -a run_flags
  run_flags=(
    '-o+[Write answers to file]:output file:_files'
    '--output+[Write answers to file]:output file:_files'
    '-f+[Output format]:format:(json yaml env)'
    '--format+[Output format]:format:(json yaml env)'
    '-q[Suppress header and summary output]'
    '--quiet[Suppress header and summary output]'
    '--dry-run[Show step plan without running the wizard]'
    '--mock+[Run wizard with preset answers]:json string:'
    '--json[Output structured JSON result to stdout]'
  )

  local -a completion_shells
  completion_shells=(
    'bash:Bash shell'
    'zsh:Zsh shell'
    'fish:Fish shell'
  )

  local context state line

  _arguments -C \
    '1: :->command' \
    '*::args:->args'

  case \$state in
    command)
      _describe 'command' subcommands
      ;;
    args)
      case \${words[2]} in
        run)
          _arguments \
            \$run_flags \
            '1:config file:_files'
          ;;
        validate)
          _arguments '1:config file:_files'
          ;;
        create)
          _arguments '1:output file:_files'
          ;;
        demo)
          ;;
        completion)
          _describe 'shell' completion_shells
          ;;
      esac
      ;;
  esac
}

_grimoire
`;
}

export function fishCompletion(): string {
  return `# Fish completion for grimoire

# Subcommands
complete -c grimoire -f -n "__fish_use_subcommand_from_list" -a "run" -d "Run a wizard from a config file"
complete -c grimoire -f -n "__fish_use_subcommand_from_list" -a "validate" -d "Validate a wizard config file without running it"
complete -c grimoire -f -n "__fish_use_subcommand_from_list" -a "create" -d "Interactively scaffold a new wizard config file"
complete -c grimoire -f -n "__fish_use_subcommand_from_list" -a "demo" -d "Run a demo wizard showcasing all step types"
complete -c grimoire -f -n "__fish_use_subcommand_from_list" -a "completion" -d "Output shell completion script"

# run command flags
complete -c grimoire -n "__fish_seen_subcommand_from run" -s o -l output -d "Write answers to file" -r
complete -c grimoire -n "__fish_seen_subcommand_from run" -s f -l format -d "Output format" -x -a "json yaml env"
complete -c grimoire -n "__fish_seen_subcommand_from run" -s q -l quiet -d "Suppress header and summary output"
complete -c grimoire -n "__fish_seen_subcommand_from run" -l dry-run -d "Show step plan without running the wizard"
complete -c grimoire -n "__fish_seen_subcommand_from run" -l mock -d "Run wizard with preset answers (JSON string)" -r
complete -c grimoire -n "__fish_seen_subcommand_from run" -l json -d "Output structured JSON result to stdout"

# completion command shells
complete -c grimoire -n "__fish_seen_subcommand_from completion" -f -a "bash" -d "Bash shell"
complete -c grimoire -n "__fish_seen_subcommand_from completion" -f -a "zsh" -d "Zsh shell"
complete -c grimoire -n "__fish_seen_subcommand_from completion" -f -a "fish" -d "Fish shell"
`;
}
