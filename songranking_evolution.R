library(tidyverse)
library(sigmajs)

data <- rio::import("../pairwise_ranker/trueskill_tt/vergleiche2.csv")

song_nodes <- c(data$Gewinner, data$Verlierer) |> unique() |> as_tibble() |> 
  rename(id = value) |> mutate(
    size = 1, 
    label = str_split(id, "@", simplify = TRUE)[,1], 
    source = str_split(id, "@", simplify = TRUE)[,2]
    )

c11 <- c(
  "#cc61b1",
  "#7fcf52",
  "#7847c1",
  "#cab74e",
  "#4b3051",
  "#78caa7",
  "#cd6234",
  "#7994c2",
  "#aa4350",
  "#515d37",
  "#ccb0a2"
)
color_key <- tibble(group = song_nodes$source |> unique(), color = c11[1:length(song_nodes$source |> unique())])

song_nodes_colored <- song_nodes |> left_join(color_key, by = join_by(source == group))
song_edges <- data |> rowid_to_column() |> 
  rename(source = Gewinner, target = Verlierer, id = rowid, dates = Datum) |> 
  mutate(delay = if_else(lag(dates) == dates, 0, 1000), 
         delay = if_else(is.na(delay), 0, delay))

sigmajs(
  width = "100%",
  height = "1300px"
) %>% # initialise
  sg_nodes(song_nodes_colored, id, label, size, color) %>% # add nodes
  sg_edges(song_edges, id, source, target) %>% # add edges
  sg_custom_shapes() |> 
  sg_layout() %>%  # layout
  #sg_cluster() %>% # cluster
  sg_drag_nodes() %>% # allows user to drag nodes
  sg_neighbours() # show node neighbours on node click

last_edge <- sum(song_edges$delay) + 100

sigmajs(
  width = "100%",
  height = "1300px"
) %>%
  sg_force_start() %>%
  sg_nodes(song_nodes_colored, id, label, size, color) %>% # add nodes
  sg_add_edges(song_edges, delay, id, source, target, refresh = TRUE) %>% # read delay documentation
  sg_progress(song_edges, delay, dates, class = "text-warning", position = "bottom") %>% # add progress text
  sg_force_stop(last_edge) %>% 
  sg_button(
    "add_edges", # event
    class = "btn btn-primary",
    # tag = tags$a,
    "Add edges" # label
  )
